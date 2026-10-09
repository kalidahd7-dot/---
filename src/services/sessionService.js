import { prisma } from '../database.js';
import { applyLedger } from './ledgerService.js';
import { t } from '../i18n/index.js';
import { logger } from '../utils/logger.js';

export async function deductSession({ studentCode, minutes, supervisorTelegramId }) {
  const student = await prisma.student.findUnique({
    where: { code: studentCode },
    include: { user: true },
  });
  if (!student) throw new Error('STUDENT_NOT_FOUND');
  if (minutes <= 0) throw new Error('INVALID_MINUTES');

  return prisma.$transaction(async (tx) => {
    // Create session record
    await tx.session.create({
      data: {
        studentId: student.id,
        minutes,
        note: `supervisor:${supervisorTelegramId}`,
      },
    });

    // Apply ledger deduction
    const { previousBalance, newBalance } = await applyLedger(tx, {
      studentId: student.id,
      type: 'SESSION_DEDUCTION',
      amountMinutes: -minutes,
      actorId: String(supervisorTelegramId),
      reference: 'session',
    });

    // Update totals
    await tx.student.update({
      where: { id: student.id },
      data: { totalUsed: student.totalUsed + minutes },
    });

    logger.info(
      { studentCode, minutes, previousBalance, newBalance },
      'session deducted'
    );

    return {
      student,
      previousBalance,
      newBalance,
      used: student.totalUsed + minutes,
      message: t(student.user.language, 'session_deducted_student', {
        minutes,
        prev: previousBalance,
        used: student.totalUsed + minutes,
        balance: newBalance,
      }),
    };
  });
}