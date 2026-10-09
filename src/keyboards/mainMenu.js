import { Markup } from 'telegraf';
import { t } from '../i18n/index.js';

export function mainMenuKeyboard(lang) {
  const k = (k2) => t(lang, k2);
  return Markup.keyboard([
    [k('menu_account'), k('menu_balance')],
    [k('menu_program'), k('menu_sessions')],
    [k('menu_schedule'), k('menu_exams')],
    [k('menu_books'), k('menu_recitations')],
    [k('menu_tajweed'), k('menu_qiraat')],
    [k('menu_talqin'), k('menu_announcements')],
    [k('menu_settings'), k('menu_contact')],
  ]).resize();
}

export function cancelKeyboard(lang) {
  return Markup.keyboard([[t(lang, 'cancel')]]).resize();
}