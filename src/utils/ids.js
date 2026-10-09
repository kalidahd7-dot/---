import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function nextStudentCode() {
  const last = await prisma.student.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });
  const n = last ? parseInt(last.code.replace('IF-', ''), 10) + 1 : 1;
  return `IF-${String(n).padStart(4, '0')}`;
}

export async function nextPaymentCode() {
  const last = await prisma.paymentRequest.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });
  const n = last ? parseInt(last.code.replace('TOP-', ''), 10) + 1 : 1;
  return `TOP-${String(n).padStart(6, '0')}`;
}