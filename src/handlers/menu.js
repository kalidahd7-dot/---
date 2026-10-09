import { t } from '../i18n/index.js';
import { findOrCreateUser } from '../services/userService.js';
import { mainMenuKeyboard } from '../keyboards/mainMenu.js';
import { formatDate } from '../utils/dates.js';
import { prisma } from '../database.js';

export function registerMenuHandlers(bot) {
  bot.hears([/حسابي/, /መለያ/, /My Account/], showAccount(bot));
  bot.hears([/رصيدي|الرصيد والتعبئة/, /ቀሪ/, /Balance/], showBalance(bot));
  bot.hears([/جدولي/, /ጊዜ ሰሌዳ/, /Schedule/], showSchedule(bot));
  bot.hears([/الإعدادات/, /ቅንብሮች/, /Settings/], showSettings(bot));
  bot.hears([/التواصل/, /ያግኙን/, /Contact/], showContact(bot));
}

function showAccount(bot) {
  return async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    if (!user.student) return ctx.reply(t(lang, 'not_registered'));

    const s = await prisma.student.findUnique({
      where: { id: user.student.id },
      include: { program: true, group: true },
    });

    const lines = [
      `👤 ${s.fullName}`,
      `${t(lang, 'account_code')}: ${s.code}`,
      `${t(lang, 'account_reg_date')}: ${formatDate(s.createdAt, lang)}`,
      `${t(lang, 'account_program')}: ${s.program ? (lang === 'ar' ? s.program.titleAr : lang === 'am' ? s.program.titleAm : s.program.titleEn) : '—'}`,
      `${t(lang, 'account_group')}: ${s.group ? (lang === 'ar' ? s.group.titleAr : lang === 'am' ? s.group.titleAm : s.group.titleEn) : '—'}`,
      `${t(lang, 'account_balance')}: ${s.balanceMinutes}`,
      `${t(lang, 'account_purchased')}: ${s.totalPurchased}`,
      `${t(lang, 'account_free')}: ${s.totalFree}`,
      `${t(lang, 'account_used')}: ${s.totalUsed}`,
    ];
    await ctx.reply(`*${t(lang, 'account_title')}*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
  };
}

function showBalance(bot) {
  return async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    if (!user.student) return ctx.reply(t(lang, 'not_registered'));

    const s = await prisma.student.findUnique({ where: { id: user.student.id } });
    await ctx.reply(
      t(lang, 'balance_current', { minutes: s.balanceMinutes })
    );
    // Packages can be listed here (extendable)
  };
}

function showSchedule(bot) {
  return async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    if (!user.student) return ctx.reply(t(lang, 'not_registered'));
    const s = await prisma.student.findUnique({
      where: { id: user.student.id },
      include: { group: true },
    });
    if (!s.group) return ctx.reply('—');
    const g = s.group;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    await ctx.reply(
      `${g.titleAr}\n${g.daysOfWeek.map((d) => dayNames[d]).join(' / ')}\n${g.startTime} – ${g.endTime}`
    );
  };
}

function showSettings(bot) {
  return async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    const { Markup } = await import('telegraf');
    await ctx.reply(t(lang, 'menu_settings'), Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, 'btn_change_language'), 'change_language')],
    ]));
  };
}

function showContact(bot) {
  return async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    await ctx.reply('☎️ Contact Administration — /support');
  };
}