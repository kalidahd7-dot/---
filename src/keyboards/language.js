import { Markup } from 'telegraf';
import { t } from '../i18n/index.js';

export function languageKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t('ar', 'lang_ar'), 'setlang:ar')],
    [Markup.button.callback(t('am', 'lang_am'), 'setlang:am')],
    [Markup.button.callback(t('en', 'lang_en'), 'setlang:en')],
  ]);
}