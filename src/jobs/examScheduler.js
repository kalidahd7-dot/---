import cron from 'node-cron';
import { prisma } from '../database.js';
import { config } from '../config.js';
import { t } from '../i18n/index.js';
import { addRestriction, syncTelegramRestriction } from '../services/restrictionService.js';
import { logger } from '../utils/logger.js';

export function startExamScheduler(bot) {
  // Run daily at 06:00 Addis time
  cron.schedule('0 6 * * *', async () => {
    logger.info('🗓️ Running exam scheduler');
    const now = new Date();

    const exams = await prisma.exam.findMany({
      where: { status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] } },
      include: { student: { include: { user: true } } },
    });

    for (const exam of exams) {
      const diffDays = Math.floor((exam.scheduledAt - now) / (1000 * 60 * 60 * 24));
      const overdueDays = -diffDays;

      // Reminder 2 days before
      if (diffDays === 2) {
        await notify(exam.student.user, t(exam.student.user.language, 'exam_reminder', { days: 2 }));
      }
      if (diffDays === 0 && exam.status !== 'DUE') {
        await prisma.exam.update({ where: { id: exam.id }, data: { status: 'DUE' } });
        await notify(exam.student.user, t(exam.student.user.language, 'exam_due'));
      }
      if (overdueDays > 0 && exam.status !== 'OVERDUE') {
        await prisma.exam.update({ where: { id: exam.id }, data: { status: 'OVERDUE' } });
        await prisma.student.update({
          where: { id: exam.studentId },
          data: { examStatus: 'OVERDUE' },
        });
      }
      if (overdueDays >= config.rules.examOverdueDays) {
        const { created } = await addRestriction({
          studentId: exam.studentId,
          reason: 'EXAM_OVERDUE',
          note: `overdue ${overdueDays} days`,
        });
        if (created) {
          await notify(
            exam.student.user,
            t(exam.student.user.language, 'exam_overdue_restriction')
          );
          await syncTelegramRestriction(bot, exam.studentId);
        }
      }
    }
  }, { timezone: config.timezone });
}

async function notify(user, text) {
  try {
    await botSend(user.telegramId, text);
  } catch (e) {
    logger.warn({ e: e.message }, 'notify failed');
  }
}

// late-bound bot reference
let _bot = null;
export function setBot(b) { _bot = b; }
async function botSend(chatId, text) {
  if (!_bot) return;
  await _bot.telegram.sendMessage(chatId.toString(), text);
}