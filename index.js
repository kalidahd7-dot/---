import { config } from './src/config.js';
import { connectDb, disconnectDb } from './src/database.js';
import { createBot } from './src/bot.js';
import { logger } from './src/utils/logger.js';
import { auditTranslations } from './src/i18n/index.js';
import { startExamScheduler, setBot as setSchedulerBot } from './src/jobs/examScheduler.js';

async function bootstrap() {
  logger.info('🚀 Starting Jazari Center Bot');

  // dev-time translation audit
  const missing = auditTranslations();
  const hasMissing = Object.values(missing).some((a) => a.length > 0);
  if (hasMissing) {
    logger.warn({ missing }, '⚠️ Missing translation keys');
  }

  await connectDb();

  const bot = createBot();
  setSchedulerBot(bot);
  startExamScheduler(bot);

  await bot.launch({ dropPendingUpdates: true });
  logger.info('✅ Bot launched');

  const shutdown = async (signal) => {
    logger.info(`⬇️ ${signal} received, shutting down`);
    try { bot.stop(signal); } catch {}
    await disconnectDb();
    process.exit(0);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((e) => {
  logger.error({ e }, 'Fatal boot error');
  process.exit(1);
});