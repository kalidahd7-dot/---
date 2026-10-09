import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => logger.error({ e }, 'prisma error'));
prisma.$on('warn',  (e) => logger.warn({ e }, 'prisma warn'));

export async function connectDb() {
  await prisma.$connect();
  logger.info('✅ Database connected');
}

export async function disconnectDb() {
  await prisma.$disconnect();
}