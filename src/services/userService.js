import { prisma } from '../database.js';
import { nextStudentCode } from '../utils/ids.js';

export async function findOrCreateUser(from) {
  const telegramId = BigInt(from.id);
  let user = await prisma.user.findUnique({
    where: { telegramId },
    include: { student: true },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId,
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        language: 'ar',
      },
      include: { student: true },
    });
  } else {
    // refresh profile (username can change)
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
      },
      include: { student: true },
    });
  }
  return user;
}

export async function setUserLanguage(userId, lang) {
  return prisma.user.update({
    where: { id: userId },
    data: { language: lang },
  });
}

export async function findStudentByCode(code) {
  return prisma.student.findUnique({
    where: { code },
    include: { user: true, program: true, group: true },
  });
}

export async function generateStudentCode() {
  return nextStudentCode();
}