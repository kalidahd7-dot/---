import { prisma } from '../database.js';
import { nextPaymentCode } from '../utils/ids.js';
import { applyLedger } from './ledgerService.js';
import { t } from '../i18n/index.js';

export async function createPaymentRequest({ studentId, packageId, receiptFileId }) {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new Error('PACKAGE_NOT_FOUND');

  const code = await nextPaymentCode();

  return prisma.paymentRequest.create({
    data: {
      code,
      studentId,
      packageId,
      minutes: pkg.minutes,
      priceEtb: pkg.priceEtb,
      receiptFileId,
      status: 'PENDING',
    },
  });
}

export async function approvePayment({ code, adminTelegramId }) {
  return prisma.$transaction(async (tx) => {
    const pr = await tx.paymentRequest.findUnique({
      where: { code },
      include: { student: { include: { user: true } } },
    });
    if (!pr) throw new Error('PAYMENT_NOT_FOUND');
    if (pr.status !== 'PENDING') throw new Error('PAYMENT_NOT_PENDING');

    await tx.paymentRequest.update({
      where: { id: pr.id },
      data: {
        status: 'APPROVED',
        reviewedById: String(adminTelegramId),
        reviewedAt: new Date(),
      },
    });

    const { newBalance } = await applyLedger(tx, {
      studentId: pr.studentId,
      type: 'PACKAGE_PURCHASE',
      amountMinutes: pr.minutes,
      actorId: String(adminTelegramId),
      reference: pr.code,
    });

    await tx.student.update({
      where: { id: pr.studentId },
      data: { totalPurchased: pr.student.totalPurchased + pr.minutes },
    });

    return {
      payment: pr,
      minutes: pr.minutes,
      newBalance,
      message: t(pr.student.user.language, 'balance_approved', {
        minutes: pr.minutes,
      }),
    };
  });
}

export async function rejectPayment({ code, adminTelegramId, reason }) {
  const pr = await prisma.paymentRequest.findUnique({
    where: { code },
    include: { student: { include: { user: true } } },
  });
  if (!pr) throw new Error('PAYMENT_NOT_FOUND');
  if (pr.status !== 'PENDING') throw new Error('PAYMENT_NOT_PENDING');

  await prisma.paymentRequest.update({
    where: { id: pr.id },
    data: {
      status: 'REJECTED',
      reviewedById: String(adminTelegramId),
      reviewedAt: new Date(),
      note: reason || null,
    },
  });

  return {
    payment: pr,
    message: t(pr.student.user.language, 'balance_rejected'),
  };
}