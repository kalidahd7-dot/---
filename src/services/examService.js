import { prisma } from '../database.js';
import { config } from '../config.js';

export function calculateNextExamAt(frequency, from = new Date()) {
  const days = frequency === 'WEEKLY' ? 7 : 14;
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export async function scheduleFirstExam(studentId, frequency) {
  const next = calculateNextExamAt(frequency, new Date());
  return prisma.exam.create({
    data: {
      studentId,
      scheduledAt: next,
      status: 'UPCOMING',
      amount: 'J5',
    },
  });
}

export async function markExamDone({ studentId, examinerTelegramId }) {
  return prisma.$transaction(async (tx) => {
    const exam = await tx.exam.findFirst({
      where: { studentId, status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] } },
      orderBy: { scheduledAt: 'asc' },
    });
    if (!exam) return null;

    await tx.exam.update({
      where: { id: exam.id },
      data: { status: 'DONE' },
    });

    await tx.examAttempt.create({
      data: {
        examId: exam.id,
        examinerId: String(examinerTelegramId),
        result: 'PASS',
      },
    });

    const student = await tx.student.findUnique({ where: { id: studentId } });

    const next = calculateNextExamAt(student.examFrequency || 'WEEKLY', new Date());
    await tx.exam.create({
      data: {
        studentId,
        scheduledAt: next,
        status: 'UPCOMING',
        amount: student.examAmount || 'J5',
      },
    });

    await tx.student.update({
      where: { id: studentId },
      data: { nextExamAt: next, examStatus: 'UPCOMING' },
    });

    return { examId: exam.id, nextAt: next };
  });
}