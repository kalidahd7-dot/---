import { Markup } from 'telegraf';
import { t } from '../i18n/index.js';
import { findOrCreateUser } from '../services/userService.js';
import {
  listActivePackages,
  setWizardState,
  getWizardState,
  clearWizardState,
  formatPaymentInstructions,
  checkPendingPayment,
  createRechargeFromReceipt,
} from '../services/rechargeWizard.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export function registerRechargeHandlers(bot) {
  // Entry: user clicks "Balance & Recharge" from menu
  bot.hears([/الرصيد والتعبئة/, /ቀሪ ሂሳብ እና መሙያ/, /Balance & Recharge/], async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;

    if (!user.student) {
      return ctx.reply(t(lang, 'rc_not_registered_recharge'));
    }

    const pending = await checkPendingPayment(user.student.id);
    if (pending) {
      return ctx.reply(t(lang, 'rc_pending_exists', { code: pending.code }));
    }

    const packages = await listActivePackages();
    if (!packages.length) return ctx.reply(t(lang, 'rc_no_packages'));

    const buttons = packages.map((p) => [
      Markup.button.callback(
        t(lang, 'balance_pkg_line', { minutes: p.minutes, price: p.priceEtb }),
        `rcpkg:${p.id}`
      ),
    ]);

    await ctx.reply(
      `${t(lang, 'rc_title')}\n\n${t(lang, 'rc_choose_package')}`,
      Markup.inlineKeyboard(buttons)
    );
  });

  // Package selection
  bot.action(/^rcpkg:([a-z0-9]+)$/i, async (ctx) => {
    const packageId = ctx.match[1];
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;

    const pkg = await botPrisma(packageId);
    if (!pkg) {
      await ctx.answerCbQuery();
      return ctx.editMessageText(t(lang, 'rc_invalid_package'));
    }

    setWizardState(ctx.from.id, {
      stage: 'awaiting_receipt',
      packageId,
      studentId: user.student.id,
    });

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `${t(lang, 'rc_selected', { minutes: pkg.minutes, price: pkg.priceEtb })}\n\n${formatPaymentInstructions(lang)}\n\n${t(lang, 'rc_await_receipt')}`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback(t(lang, 'rc_choose_again'), 'rcback')],
        ]).reply_markup,
      }
    );
  });

  bot.action('rcback', async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    clearWizardState(ctx.from.id);
    const lang = user.language;
    const packages = await listActivePackages();
    const buttons = packages.map((p) => [
      Markup.button.callback(
        t(lang, 'balance_pkg_line', { minutes: p.minutes, price: p.priceEtb }),
        `rcpkg:${p.id}`
      ),
    ]);
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(lang, 'rc_choose_package'), Markup.inlineKeyboard(buttons));
  });

  // Receipt photo
  bot.on('photo', async (ctx, next) => {
    const st = getWizardState(ctx.from.id);
    if (!st || st.stage !== 'awaiting_receipt') return next();

    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    const photos = ctx.message.photo;
    const biggest = photos[photos.length - 1];

    // Check size (Telegram file_size ~ bytes)
    if (biggest.file_size && biggest.file_size > 5 * 1024 * 1024) {
      return ctx.reply(t(lang, 'rc_receipt_too_big'));
    }

    try {
      const pr = await createRechargeFromReceipt({
        studentId: st.studentId,
        packageId: st.packageId,
        receiptFileId: biggest.file_id,
      });
      clearWizardState(ctx.from.id);

      await ctx.reply(
        t(lang, 'rc_receipt_received', { code: pr.code }),
        { parse_mode: 'Markdown' }
      );

      // Forward to supervisor group
      await forwardToSupervisors(bot, pr, user);
    } catch (e) {
      logger.error({ e: e.message }, 'receipt failed');
      await ctx.reply(t(lang, 'error_generic'));
    }
  });

  // Cancel
  bot.command('cancel', async (ctx) => {
    const st = getWizardState(ctx.from.id);
    if (!st) return;
    const user = await findOrCreateUser(ctx.from);
    clearWizardState(ctx.from.id);
    await ctx.reply(t(user.language, 'rc_cancelled'));
  });
}

async function botPrisma(packageId) {
  const { prisma } = await import('../database.js');
  return prisma.package.findUnique({ where: { id: packageId } });
}

async function forwardToSupervisors(bot, pr, user) {
  const groupId = config.bot.supervisorGroupId;
  if (!groupId) {
    logger.warn('SUPERVISOR_GROUP_ID not configured — receipt not forwarded');
    return;
  }

  const pkg = await (await import('../database.js')).prisma.package.findUnique({
    where: { id: pr.packageId },
  });
  const student = await (await import('../database.js')).prisma.student.findUnique({
    where: { id: pr.studentId },
  });

  const caption = t('ar', 'admin_receipt_caption', {
    code: pr.code,
    name: student.fullName,
    minutes: pkg.minutes,
    price: pkg.priceEtb,
  });

  try {
    if (pr.receiptFileId) {
      await bot.telegram.sendPhoto(groupId.toString(), pr.receiptFileId, {
        caption: `${caption}\n\n/approve ${pr.code}\n/reject ${pr.code}`,
      });
    } else {
      await bot.telegram.sendMessage(
        groupId.toString(),
        `${caption}\n\n/approve ${pr.code}\n/reject ${pr.code}`
      );
    }
  } catch (e) {
    logger.warn({ e: e.message }, 'forward receipt failed');
  }
}