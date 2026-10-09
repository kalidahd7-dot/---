import { prisma } from '../database.js';
import { config } from '../config.js';
import { t } from '../i18n/index.js';

/**
 * Add a restriction. Returns true if this is a NEW active restriction.
 */
export async function addRestriction({ studentId, reason, createdById = null, note = null }) {
  const existing = await prisma.restriction.findFirst({
    where: { studentId, reason, isActive: true },
  });
  if (existing) return { created: false, restriction: existing };

  const restriction = await prisma.restriction.create({
    data: { studentId, reason, createdById, note },
  });
  return { created: true, restriction };
}

export async function removeRestriction({ studentId, reason }) {
  const r = await prisma.restriction.updateMany({
    where: { studentId, reason, isActive: true },
    data: { isActive: false, removedAt: new Date() },
  });
  return r.count > 0;
}

export async function hasActiveBlockingRestriction(studentId) {
  const blocking = ['EXAM_OVERDUE', 'LOAN_LIMIT', 'ADMIN_MANUAL'];
  const count = await prisma.restriction.count({
    where: { studentId, isActive: true, reason: { in: blocking } },
  });
  return count > 0;
}

/**
 * Sync a student's Telegram restriction in their group based on active DB restrictions.
 * If no blocking reasons remain → unrestrict.
 * If any blocking reason exists → restrict.
 */
export async function syncTelegramRestriction(bot, studentId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true, group: true },
  });
  if (!student || !student.group?.telegramId) return;

  const shouldBlock = await hasActiveBlockingRestriction(studentId);
  const chatId = student.group.telegramId.toString();
  const userId = Number(student.user.telegramId);

  try {
    if (shouldBlock) {
      await bot.telegram.restrictChatMember(chatId, userId, {
        permissions: { can_send_messages: false },
      });
    } else {
      await bot.telegram.restrictChatMember(chatId, userId, {
        permissions: {
          can_send_messages: true,
          can_send_media_messages: true,
          can_send_other_messages: true,
          can_add_web_page_previews: true,
        },
      });
    }
  } catch (e) {
    // log only — do not crash
    console.error('restrictChatMember failed', e.message);
  }
}