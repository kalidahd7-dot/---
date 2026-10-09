import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { applyLedger } from '../src/services/ledgerService.js';

const prisma = new PrismaClient();
let studentId;
let userId;

before(async () => {
  // Create ephemeral test user
  const u = await prisma.user.create({
    data: {
      telegramId: BigInt(Date.now()),
      language: 'ar',
    },
  });
  userId = u.id;
  const s = await prisma.student.create({
    data: {
      userId: u.id,
      code: `TEST-${Date.now()}`,
      fullName: 'Test Student',
      gender: 'MALE',
      readingLevel: 'BEGINNER',
      balanceMinutes: 0,
    },
  });
  studentId = s.id;
});

after(async () => {
  if (studentId) await prisma.student.delete({ where: { id: studentId } });
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

test('applyLedger: welcome bonus increases balance and writes ledger', async () => {
  const result = await prisma.$transaction((tx) =>
    applyLedger(tx, {
      studentId,
      type: 'WELCOME_BONUS',
      amountMinutes: 30,
    })
  );

  assert.equal(result.previousBalance, 0);
  assert.equal(result.newBalance, 30);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  assert.equal(student.balanceMinutes, 30);

  const ledger = await prisma.balanceLedger.findFirst({
    where: { studentId, type: 'WELCOME_BONUS' },
  });
  assert.ok(ledger);
  assert.equal(ledger.amountMinutes, 30);
});

test('applyLedger: session deduction reduces balance', async () => {
  const result = await prisma.$transaction((tx) =>
    applyLedger(tx, {
      studentId,
      type: 'SESSION_DEDUCTION',
      amountMinutes: -20,
    })
  );

  assert.equal(result.newBalance, 10);

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  assert.equal(student.balanceMinutes, 10);
});

test('applyLedger: loan usage allows negative balance', async () => {
  const result = await prisma.$transaction((tx) =>
    applyLedger(tx, {
      studentId,
      type: 'LOAN_USAGE',
      amountMinutes: -50,
    })
  );

  assert.equal(result.newBalance, -40);
});