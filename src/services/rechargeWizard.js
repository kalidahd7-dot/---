import { prisma } from '../database.js';
import { config } from '../config.js';
import { t } from '../i18n/index.js';
import { createPaymentRequest } from './paymentService.js';

// In-memory wizard state per user
// Structure: telegramId -> { stage: 'awaiting_receipt', packageId, code? }
const STATES = new Map();

export function getWizardState(telegramId) {
  return STATES.get(telegramId) || null;
}

export function setWizardState(telegramId, state) {
  STATES.set(telegramId, state);
}

export function clearWizardState(telegramId) {
  STATES.delete(telegramId);
}

export async function listActivePackages() {
  return prisma.package.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export function formatPaymentInstructions(lang) {
  const lines = [t(lang, 'rc_pay_header'), ''];

  if (config.payment.telebirrNumber) {
    lines.push(
      t(lang, 'rc_pay_telebirr', {
        number: config.payment.telebirrNumber,
        name: lang === 'ar'
          ? config.payment.telebirrAccountNameAr
          : config.payment.telebirrAccountNameEn,
      })
    );
  }

  if (config.payment.bankName && config.payment.bankAccountNumber) {
    lines.push('');
    lines.push(
      t(lang, 'rc_pay_bank', {
        bank: config.payment.bankName,
        account: config.payment.bankAccountNumber,
        holder: config.payment.bankAccountName,
      })
    );
  }

  return lines.join('\n');
}

export async function checkPendingPayment(studentId) {
  return prisma.paymentRequest.findFirst({
    where: { studentId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createRechargeFromReceipt({
  studentId,
  packageId,
  receiptFileId,
}) {
  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg || !pkg.isActive) throw new Error('INVALID_PACKAGE');

  return createPaymentRequest({ studentId, packageId, receiptFileId });
}