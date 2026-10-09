import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { rateLimit } from './middleware/rateLimit.js';
import { registerStartHandlers } from './handlers/start.js';
import { registerRegistrationHandlers } from './handlers/registration.js';
import { registerMenuHandlers } from './handlers/menu.js';
import { registerAdminHandlers } from './handlers/admin.js';

export function createBot() {
  const bot = new Telegraf(config.bot.token);

  // global rate limit
  bot.use(rateLimit({ windowMs: 5000, max: 8 }));

  // error handler
  bot.catch((err, ctx) => {
    logger.error({ err: err.message, update: ctx.update }, 'bot error');
    ctx.reply('❌ An error occurred. Please try again.').catch(() => {});
  });

  registerStartHandlers(bot);
  registerRegistrationHandlers(bot);
  registerMenuHandlers(bot);
  registerAdminHandlers(bot);

  return bot;
}
import { registerRechargeHandlers } from './handlers/recharge.js';
import { registerContentHandlers } from './handlers/content.js';
import { registerAdminContentHandlers } from './handlers/adminContent.js';

// داخل createBot() بعد registerAdminHandlers:
registerRechargeHandlers(bot);
registerContentHandlers(bot);
registerAdminContentHandlers(bot);