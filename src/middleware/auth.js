import { config } from '../config.js';
import { t } from '../i18n/index.js';

export function isAdmin(telegramId) {
  return config.bot.adminIds.includes(BigInt(telegramId));
}

export async function requireAdmin(ctx, next) {
  const id = ctx.from?.id;
  if (!id || !isAdmin(id)) {
    const lang = ctx.state?.user?.language || 'ar';
    return ctx.reply(t(lang, 'unauthorized'));
  }
  return next();
}