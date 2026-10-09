import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { deductSession } from '../src/services/sessionService.js';

const prisma = new PrismaClient();
let studentId, userId, studentCode;

before(async () => {
  const u = await prisma.user.create({
    data: { telegramId: BigInt(Date.now() + 1), language: 'ar' },
  });
  userId = u.id;
  const code = `TST-${Date.now()}`;
  const s = await prisma.student.create({
    data: {
      userId: u.id,
      code,
      fullName: 'Session Test',
      gender: 'MALE',
      readingLevel: 'BEGINNER',
      balanceMinutes: 100,
    },
  });
  studentId = s.id;
  studentCode = code;
});

after(async () => {
  if (studentId) await prisma.student.delete({ where: { id: studentId } });
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

test('deductSession: creates session + ledger + updates totals', async () => {
  const r = await deductSession({
    studentCode,
    minutes: 20,
    supervisorTelegramId: 999,
  });

  assert.equal(r.previousBalance, 100);
  assert.equal(r.newBalance, 80);
  assert.equal(r.used, 20);

  const session = await prisma.session.findFirst({ where: { studentId } });
  assert.ok(session);
  assert.equal(session.minutes, 20);

  const ledger = await prisma.balanceLedger.findFirst({
    where: { studentId, type: 'SESSION_DEDUCTION' },
  });
  assert.equal(ledger.amountMinutes, -20);
});

test('deductSession: invalid minutes throws', async () => {
  await assert.rejects(
    () => deductSession({ studentCode, minutes: 0, supervisorTelegramId: 999 }),
    /INVALID_MINUTES/
  );
});

test('deductSession: unknown student throws', async () => {
  await assert.rejects(
    () => deductSession({ studentCode: 'XXX', minutes: 10, supervisorTelegramId: 999 }),
    /STUDENT_NOT_FOUND/
  );
});