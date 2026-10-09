import { t } from '../i18n/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { prisma } from '../database.js';
import { deductSession } from '../services/sessionService.js';
import { approvePayment, rejectPayment } from '../services/paymentService.js';
import { markExamDone } from '../services/examService.js';
import { removeRestriction, syncTelegramRestriction } from '../services/restrictionService.js';
import { findStudentByCode } from '../services/userService.js';

export function registerAdminHandlers(bot) {
  bot.command('deduct', requireAdmin, async (ctx) => {
    const parts = ctx.message.text.split(/\s+/).slice(1);
    const [code, minutesStr] = parts;
    const minutes = parseInt(minutesStr, 10);
    if (!code || !minutes) return ctx.reply('Usage: /deduct IF-0021 20');

    try {
      const r = await deductSession({
        studentCode: code,
        minutes,
        supervisorTelegramId: ctx.from.id,
      });

      // notify student
      await bot.telegram.sendMessage(r.student.user.telegramId.toString(), r.message);

      // check loan restriction
      if (r.newBalance < -100) {
        const { addRestriction } = await import('../services/restrictionService.js');
        await addRestriction({ studentId: r.student.id, reason: 'LOAN_LIMIT' });
        await syncTelegramRestriction(bot, r.student.id);
      }

      return ctx.reply(t(ctx.state?.user?.language || 'ar', 'admin_deduct_ok', { code, minutes }));
    } catch (e) {
      if (e.message === 'STUDENT_NOT_FOUND') {
        return ctx.reply(t('ar', 'admin_student_not_found', { code }));
      }
      return ctx.reply(`❌ ${e.message}`);
    }
  });

  bot.command('approve', requireAdmin, async (ctx) => {
    const code = ctx.message.text.split(/\s+/)[1];
    if (!code) return ctx.reply('Usage: /approve TOP-000001');
    try {
      const r = await approvePayment({ code, adminTelegramId: ctx.from.id });
      await bot.telegram.sendMessage(r.payment.student.user.telegramId.toString(), r.message);
      return ctx.reply(t('ar', 'admin_approve_ok', { code }));
    } catch (e) {
      return ctx.reply(`❌ ${e.message}`);
    }
  });

  bot.command('reject', requireAdmin, async (ctx) => {
    const parts = ctx.message.text.split(/\s+/).slice(1);
    const [code, ...rest] = parts;
    if (!code) return ctx.reply('Usage: /reject TOP-000001 [reason]');
    try {
      const r = await rejectPayment({ code, adminTelegramId: ctx.from.id, reason: rest.join(' ') });
      await bot.telegram.sendMessage(r.payment.student.user.telegramId.toString(), r.message);
      return ctx.reply(t('ar', 'admin_reject_ok', { code }));
    } catch (e) {
      return ctx.reply(`❌ ${e.message}`);
    }
  });

  bot.command('exam_done', requireAdmin, async (ctx) => {
    const code = ctx.message.text.split(/\s+/)[1];
    if (!code) return ctx.reply('Usage: /exam_done IF-0021');
    const student = await findStudentByCode(code);
    if (!student) return ctx.reply(t('ar', 'admin_student_not_found', { code }));

    const r = await markExamDone({ studentId: student.id, examinerTelegramId: ctx.from.id });
    if (!r) return ctx.reply('No active exam');

    await removeRestriction({ studentId: student.id, reason: 'EXAM_OVERDUE' });
    await syncTelegramRestriction(bot, student.id);

    return ctx.reply(t('ar', 'admin_exam_done_ok', { code }));
  });

  bot.command('balance', requireAdmin, async (ctx) => {
    const code = ctx.message.text.split(/\s+/)[1];
    if (!code) return ctx.reply('Usage: /balance IF-0021');
    const s = await findStudentByCode(code);
    if (!s) return ctx.reply(t('ar', 'admin_student_not_found', { code }));
    return ctx.reply(`👤 ${s.fullName} (${s.code})\n💳 ${s.balanceMinutes} min`);
  });

  bot.command('broadcast', requireAdmin, async (ctx) => {
    const text = ctx.message.text.split(/\s+/).slice(1).join(' ').trim();
    if (!text) return ctx.reply(t('ar', 'admin_broadcast_ask'));

    const users = await prisma.user.findMany({ where: { isBlocked: false } });
    let count = 0;
    for (const u of users) {
      try {
        await bot.telegram.sendMessage(u.telegramId.toString(), text, { parse_mode: 'Markdown' });
        count++;
      } catch {}
    }
    return ctx.reply(t('ar', 'admin_broadcast_sent', { count }));
  });
}