import { prisma } from '../database.js';
import { config } from '../config.js';
import { t } from '../i18n/index.js';
import { addRestriction, removeRestriction, syncTelegramRestriction } from './restrictionService.js';

export async function checkBalanceAndWarn(bot, studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student) return;

  const lang = student.user.language;
  const balance = student.balanceMinutes;
  const maxLoan = config.rules.maxLoanMinutes;

  if (balance <= -maxLoan) {
    // Restrict
    const { created } = await addRestriction({
      studentId,
      reason: 'LOAN_LIMIT',
      note: `balance=${balance}`,
    });
    if (created) {
      await bot.telegram
        .sendMessage(
          student.user.telegramId.toString(),
          t(lang, 'loan_limit_reached')
        )
        .catch(() => {});
      await syncTelegramRestriction(bot, studentId);
    }
    return;
  }

  if (balance <= 0) {
    await bot.telegram
      .sendMessage(
        student.user.telegramId.toString(),
        t(lang, 'loan_warning_zero', { max: maxLoan })
      )
      .catch(() => {});
    return;
  }

  if (balance < 20) {
    await bot.telegram
      .sendMessage(
        student.user.telegramId.toString(),
        t(lang, 'loan_warning_low', { balance })
      )
      .catch(() => {});
    return;
  }

  if (balance < maxLoan * 0.2) {
    await bot.telegram
      .sendMessage(
        student.user.telegramId.toString(),
        t(lang, 'loan_warning_near_limit', { max: maxLoan })
      )
      .catch(() => {});
  }
}

export async function clearLoanRestriction(bot, studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student) return;
  if (student.balanceMinutes > 0) {
    const removed = await removeRestriction({ studentId, reason: 'LOAN_LIMIT' });
    if (removed) {
      await bot.telegram
        .sendMessage(
          student.user.telegramId.toString(),
          t(student.user.language, 'restriction_removed')
        )
        .catch(() => {});
      await syncTelegramRestriction(bot, studentId);
    }
  }
}