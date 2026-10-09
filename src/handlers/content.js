import { Markup } from 'telegraf';
import { t } from '../i18n/index.js';
import { findOrCreateUser } from '../services/userService.js';
import {
  getCategories,
  getCategoryByCode,
  getResourcesByCategory,
  getResourceById,
  getChildren,
  localize,
  typeLabel,
} from '../services/resourceService.js';

// Map menu labels -> category codes
const MENU_TO_CATEGORY = {
  // handled dynamically by matching regex below
};

export function registerContentHandlers(bot) {
  // Entry points from main menu
  bot.hears([/📚 الكتب والمراجع/, /📚 መጻሕፍት/, /📚 Books/], (ctx) =>
    openCategory(ctx, 'BOOKS', 'ct_books_title')
  );
  bot.hears([/🎧 التلاوات/, /🎧 የቁርአን ንባቦች/, /🎧 Quran Recitations/], (ctx) =>
    openReciters(ctx)
  );
  bot.hears([/🎓 دروس التجويد/, /🎓 የተጅዊድ/, /🎓 Tajweed/], (ctx) =>
    openTeachers(ctx, 'TAJWEED', 'ct_tajweed_title')
  );
  bot.hears([/📜 دروس القراءات/, /📜 የቂራአት/, /📜 Qira'at/], (ctx) =>
    openCategory(ctx, 'QIRAAT', 'ct_qiraat_title')
  );
  bot.hears([/🎙️ التلقين/, /🎙️ ተልቂን/, /🎙️ Talqin/], (ctx) =>
    openTeachers(ctx, 'TALQIN', 'ct_talqin_title')
  );

  // Category callbacks
  bot.action(/^ct:cat:(.+)$/, async (ctx) => {
    const code = ctx.match[1];
    await showCategoryResources(ctx, code);
    await ctx.answerCbQuery();
  });

  // Reciter -> surah
  bot.action(/^ct:reciter:(.+)$/, async (ctx) => {
    const reciterId = ctx.match[1];
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    const children = await getChildren(reciterId);
    if (!children.length) {
      await ctx.answerCbQuery();
      return ctx.editMessageText(t(lang, 'ct_empty_category'));
    }
    const buttons = children.map((r) => [
      Markup.button.callback(localize(r, 'title', lang), `ct:res:${r.id}`),
    ]);
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(lang, 'ct_choose_surah'), Markup.inlineKeyboard(buttons));
  });

  // Teacher -> course
  bot.action(/^ct:teacher:(.+)$/, async (ctx) => {
    const teacherId = ctx.match[1];
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    const children = await getChildren(teacherId);
    if (!children.length) {
      await ctx.answerCbQuery();
      return ctx.editMessageText(t(lang, 'ct_empty_category'));
    }
    const buttons = children.map((r) => [
      Markup.button.callback(localize(r, 'title', lang), `ct:course:${r.id}`),
    ]);
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(lang, 'ct_choose_course'), Markup.inlineKeyboard(buttons));
  });

  bot.action(/^ct:course:(.+)$/, async (ctx) => {
    const courseId = ctx.match[1];
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    const children = await getChildren(courseId);
    if (!children.length) {
      await ctx.answerCbQuery();
      return ctx.editMessageText(t(lang, 'ct_empty_category'));
    }
    const buttons = children.map((r) => [
      Markup.button.callback(localize(r, 'title', lang), `ct:res:${r.id}`),
    ]);
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(lang, 'ct_choose_lesson'), Markup.inlineKeyboard(buttons));
  });

  // Juz -> surah (for Talqin)
  bot.action(/^ct:juz:(.+)$/, async (ctx) => {
    const juzId = ctx.match[1];
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    const children = await getChildren(juzId);
    const buttons = children.map((r) => [
      Markup.button.callback(localize(r, 'title', lang), `ct:res:${r.id}`),
    ]);
    await ctx.answerCbQuery();
    await ctx.editMessageText(t(lang, 'ct_choose_surah'), Markup.inlineKeyboard(buttons));
  });

  // Show resource
  bot.action(/^ct:res:(.+)$/, async (ctx) => {
    const id = ctx.match[1];
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    const r = await getResourceById(id);
    if (!r) {
      await ctx.answerCbQuery();
      return ctx.editMessageText(t(lang, 'ct_resource_not_found'));
    }

    const title = localize(r, 'title', lang);
    const desc = localize(r, 'desc', lang);
    const teacher = r.teacher || '';

    // If has children -> drill down
    const children = await getChildren(r.id);
    if (children.length) {
      const buttons = children.map((c) => [
        Markup.button.callback(localize(c, 'title', lang), `ct:res:${c.id}`),
      ]);
      await ctx.answerCbQuery();
      return ctx.editMessageText(
        `*${title}*\n${desc}\n\n${t(lang, 'ct_choose_lesson')}`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      );
    }

    if (!r.url) {
      await ctx.answerCbQuery();
      return ctx.editMessageText(t(lang, 'ct_open_url_error'));
    }

    const text = teacher
      ? t(lang, 'ct_lesson_open', { title, teacher, url: r.url })
      : `*${title}*\n${desc}\n\n🔗 ${r.url}`;

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `${text}\n\n${typeLabel(r.type, (k) => t(lang, k))}`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.url(t(lang, 'ct_open_link'), r.url)],
        ]).reply_markup,
      }
    );
  });

  // Back to categories
  bot.action('ct:back', async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    await ctx.answerCbQuery();
    await showCategories(ctx, user.language);
  });
}

async function openCategory(ctx, code, titleKey) {
  const user = await findOrCreateUser(ctx.from);
  const lang = user.language;
  const cat = await getCategoryByCode(code);
  if (!cat) return ctx.reply(t(lang, 'ct_empty_category'));
  await showCategoryResources(ctx, code, titleKey);
}

async function showCategoryResources(ctx, categoryCode, titleKey) {
  const user = await findOrCreateUser(ctx.from);
  const lang = user.language;
  const cat = await getCategoryByCode(categoryCode);
  if (!cat) return ctx.reply(t(lang, 'ct_empty_category'));

  const resources = await getResourcesByCategory(cat.id);
  if (!resources.length) return ctx.reply(t(lang, 'ct_empty_category'));

  const buttons = resources.map((r) => [
    Markup.button.callback(
      `${typeLabel(r.type, (k) => t(lang, k))} ${localize(r, 'title', lang)}`,
      `ct:res:${r.id}`
    ),
  ]);
  buttons.push([Markup.button.callback(t(lang, 'ct_back_to_categories'), 'ct:back')]);

  const header = titleKey ? t(lang, titleKey) : localize(cat, 'title', lang);
  const msg = `${header}\n\n${t(lang, 'ct_choose_category')}`;

  if (ctx.callbackQuery) {
    return ctx.editMessageText(msg, Markup.inlineKeyboard(buttons));
  }
  return ctx.reply(msg, Markup.inlineKeyboard(buttons));
}

async function showCategories(ctx, lang) {
  const cats = await getCategories();
  const buttons = cats.map((c) => [
    Markup.button.callback(localize(c, 'title', lang), `ct:cat:${c.code}`),
  ]);
  await ctx.reply(t(lang, 'ct_choose_category'), Markup.inlineKeyboard(buttons));
}

async function openReciters(ctx) {
  const user = await findOrCreateUser(ctx.from);
  const lang = user.language;
  const cat = await getCategoryByCode('RECITERS');
  if (!cat) return ctx.reply(t(lang, 'ct_empty_category'));
  const reciters = await getResourcesByCategory(cat.id);
  if (!reciters.length) return ctx.reply(t(lang, 'ct_empty_category'));
  const buttons = reciters.map((r) => [
    Markup.button.callback(localize(r, 'title', lang), `ct:reciter:${r.id}`),
  ]);
  await ctx.reply(
    `${t(lang, 'ct_recitations_title')}\n\n${t(lang, 'ct_choose_reciter')}`,
    Markup.inlineKeyboard(buttons)
  );
}

async function openTeachers(ctx, categoryCode, titleKey) {
  const user = await findOrCreateUser(ctx.from);
  const lang = user.language;
  const cat = await getCategoryByCode(categoryCode);
  if (!cat) return ctx.reply(t(lang, 'ct_empty_category'));
  const teachers = await getResourcesByCategory(cat.id);
  if (!teachers.length) return ctx.reply(t(lang, 'ct_empty_category'));
  const buttons = teachers.map((r) => [
    Markup.button.callback(localize(r, 'title', lang), `ct:teacher:${r.id}`),
  ]);
  await ctx.reply(
    `${t(lang, titleKey)}\n\n${t(lang, 'ct_choose_teacher')}`,
    Markup.inlineKeyboard(buttons)
  );
}