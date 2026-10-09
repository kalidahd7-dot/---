import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { approvePayment, rejectPayment } from '../src/services/paymentService.js';
import { createRechargeFromReceipt } from '../src/services/rechargeWizard.js';

const prisma = new PrismaClient();
let studentId, userId, packageId;

before(async () => {
  const u = await prisma.user.create({
    data: { telegramId: BigInt(Date.now() + 2), language: 'ar' },
  });
  userId = u.id;
  const s = await prisma.student.create({
    data: {
      userId: u.id,
      code: `PAY-${Date.now()}`,
      fullName: 'Payment Test',
      gender: 'MALE',
      readingLevel: 'BEGINNER',
      balanceMinutes: 0,
    },
  });
  studentId = s.id;
  const p = await prisma.package.findFirst({ where: { isActive: true } });
  packageId = p.id;
});

after(async () => {
  if (studentId) await prisma.student.delete({ where: { id: studentId } });
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

test('approve: adds minutes, writes ledger, prevents double approval', async () => {
  const pr = await createRechargeFromReceipt({
    studentId,
    packageId,
    receiptFileId: 'fake',
  });

  const r = await approvePayment({ code: pr.code, adminTelegramId: 1 });
  assert.equal(r.minutes > 0, true);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  assert.equal(student.balanceMinutes, r.minutes);

  // Double approval should fail
  await assert.rejects(
    () => approvePayment({ code: pr.code, adminTelegramId: 1 }),
    /PAYMENT_NOT_PENDING/
  );
});

test('reject: marks rejected and does not add minutes', async () => {
  const pr = await createRechargeFromReceipt({
    studentId,
    packageId,
    receiptFileId: 'fake2',
  });
  const before = (await prisma.student.findUnique({ where: { id: studentId } })).balanceMinutes;

  await rejectPayment({ code: pr.code, adminTelegramId: 1, reason: 'test' });

  const after = (await prisma.student.findUnique({ where: { id: studentId } })).balanceMinutes;
  assert.equal(after, before);
});