import { Markup } from 'telegraf';
import { t } from '../i18n/index.js';
import { findOrCreateUser, setUserLanguage } from '../services/userService.js';
import { languageKeyboard } from '../keyboards/language.js';
import { mainMenuKeyboard } from '../keyboards/mainMenu.js';

export function registerStartHandlers(bot) {
  bot.start(async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    ctx.state.user = user;

    if (!user.language || !['ar', 'am', 'en'].includes(user.language)) {
      await ctx.reply(
        `${t('ar', 'choose_language_title')}\n${t('ar', 'choose_language_subtitle')}`,
        languageKeyboard()
      );
      return;
    }

    if (!user.student) {
      await ctx.reply(
        `${t(user.language, 'welcome_title')}\n${t(user.language, 'welcome_subtitle')}\n\n${t(user.language, 'welcome_new_user')}`,
        Markup.inlineKeyboard([
          [Markup.button.callback(t(user.language, 'btn_register'), 'register:start')],
        ])
      );
      return;
    }

    await ctx.reply(
      `${t(user.language, 'welcome_returning')}`,
      mainMenuKeyboard(user.language)
    );
  });

  bot.action(/^setlang:(ar|am|en)$/, async (ctx) => {
    const lang = ctx.match[1];
    const user = await findOrCreateUser(ctx.from);
    await setUserLanguage(user.id, lang);
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(lang, 'language_changed'));
    await ctx.reply(t(lang, 'welcome_returning'), mainMenuKeyboard(lang));
  });

  bot.action('change_language', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(t('ar', 'choose_language_title'), languageKeyboard());
  });
}