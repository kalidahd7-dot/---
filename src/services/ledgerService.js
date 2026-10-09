import { prisma } from '../database.js';

/**
 * Apply a balance change atomically inside a transaction.
 * Creates a ledger row and updates Student balance.
 */
export async function applyLedger(tx, {
  studentId,
  type,
  amountMinutes,
  actorId = null,
  reference = null,
  note = null,
}) {
  const student = await tx.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error('STUDENT_NOT_FOUND');

  const previousBalance = student.balanceMinutes;
  const newBalance = previousBalance + amountMinutes;

  const ledger = await tx.balanceLedger.create({
    data: {
      studentId,
      type,
      amountMinutes,
      previousBalance,
      newBalance,
      actorId,
      reference,
      note,
    },
  });

  await tx.student.update({
    where: { id: studentId },
    data: { balanceMinutes: newBalance },
  });

  return { ledger, previousBalance, newBalance };
}