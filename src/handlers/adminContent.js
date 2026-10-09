import { Markup } from 'telegraf';
import { t } from '../i18n/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { prisma } from '../database.js';
import {
  createResource,
  updateResource,
  deleteResource,
  disableResource,
  enableResource,
  reorderResource,
} from '../services/contentAdminService.js';
import { localize } from '../services/resourceService.js';

// State: telegramId -> { action, step, data }
const SESSIONS = new Map();

export function registerAdminContentHandlers(bot) {
  bot.command('content', requireAdmin, async (ctx) => {
    const parts = ctx.message.text.split(/\s+/).slice(1);
    const action = parts[0];

    if (!action) {
      return ctx.reply(
        t('ar', 'acp_title'),
        Markup.inlineKeyboard([
          [Markup.button.callback(t('ar', 'acp_add'), 'acp:add')],
          [Markup.button.callback(t('ar', 'acp_edit'), 'acp:edit')],
          [Markup.button.callback(t('ar', 'acp_disable'), 'acp:disable')],
          [Markup.button.callback(t('ar', 'acp_enable'), 'acp:enable')],
          [Markup.button.callback(t('ar', 'acp_delete'), 'acp:delete')],
          [Markup.button.callback(t('ar', 'acp_reorder'), 'acp:reorder')],
          [Markup.button.callback(t('ar', 'acp_list'), 'acp:list')],
        ])
      );
    }

    switch (action) {
      case 'add':
        return startAdd(ctx);
      case 'edit':
        return ctx.reply(t('ar', 'acp_usage_edit'));
      case 'delete':
        return ctx.reply(t('ar', 'acp_usage_del'));
      case 'list':
        return showList(ctx);
      default:
        return ctx.reply(t('ar', 'acp_title'));
    }
  });

  // Action entry
  bot.action('acp:add', async (ctx) => {
    await ctx.answerCbQuery();
    await startAdd(ctx);
  });

  bot.action('acp:list', async (ctx) => {
    await ctx.answerCbQuery();
    await showList(ctx);
  });

  bot.action('acp:disable', async (ctx) => {
    await ctx.answerCbQuery();
    await showPickFor(ctx, 'disable');
  });
  bot.action('acp:enable', async (ctx) => {
    await ctx.answerCbQuery();
    await showPickFor(ctx, 'enable');
  });
  bot.action('acp:delete', async (ctx) => {
    await ctx.answerCbQuery();
    await showPickFor(ctx, 'delete');
  });
  bot.action('acp:reorder', async (ctx) => {
    await ctx.answerCbQuery();
    await showPickFor(ctx, 'reorder');
  });
  bot.action('acp:edit', async (ctx) => {
    await ctx.answerCbQuery();
    await showPickFor(ctx, 'edit');
  });

  // Pick an existing resource for an action
  bot.action(/^acp:pick:(\w+):(.+)$/, async (ctx) => {
    const [, action, resourceId] = ctx.match;
    const user = await requireUser(ctx);
    await ctx.answerCbQuery();
    await applyAction(ctx, user, action, resourceId);
  });

  // Category picker for add
  bot.action(/^acp:newcat:(.+)$/, async (ctx) => {
    const catCode = ctx.match[1];
    const session = SESSIONS.get(ctx.from.id);
    if (!session) return ctx.answerCbQuery();
    const cat = await prisma.resourceCategory.findUnique({ where: { code: catCode } });
    session.data.categoryId = cat.id;
    session.step = 'type';
    await ctx.answerCbQuery();
    await ctx.reply(t('ar', 'acp_choose_type'), Markup.inlineKeyboard([
      [Markup.button.callback('📖 BOOK', 'acp:newtype:BOOK')],
      [Markup.button.callback('📄 PDF', 'acp:newtype:PDF')],
      [Markup.button.callback('🌐 WEBSITE', 'acp:newtype:WEBSITE')],
      [Markup.button.callback('🎧 AUDIO', 'acp:newtype:AUDIO')],
      [Markup.button.callback('▶️ YOUTUBE', 'acp:newtype:YOUTUBE')],
      [Markup.button.callback('🎼 PLAYLIST', 'acp:newtype:PLAYLIST')],
    ]));
  });

  bot.action(/^acp:newtype:(.+)$/, async (ctx) => {
    const type = ctx.match[1];
    const session = SESSIONS.get(ctx.from.id);
    if (!session) return ctx.answerCbQuery();
    session.data.type = type;
    session.step = 'titleAr';
    await ctx.answerCbQuery();
    await ctx.reply(t('ar', 'acp_ask_title_ar'));
  });

  // Text capture during wizard
  bot.on('text', async (ctx, next) => {
    const session = SESSIONS.get(ctx.from.id);
    if (!session || !session.step) return next();

    const val = ctx.message.text.trim();
    const isSkip = val === '/skip';
    const cancel = val === '/cancel';

    if (cancel) {
      SESSIONS.delete(ctx.from.id);
      return ctx.reply(t('ar', 'acp_cancelled'));
    }

    const { step, data, action, resourceId } = session;

    // Edit-only: first text = new sort order if action=reorder
    if (action === 'reorder') {
      const n = parseInt(val, 10);
      if (isNaN(n) || n < 0 || n > 999) return ctx.reply(t('ar', 'acp_ask_new_order'));
      await reorderResource(resourceId, n);
      SESSIONS.delete(ctx.from.id);
      return ctx.reply(t('ar', 'acp_saved'));
    }

    if (action === 'edit' && !data.titleAr) {
      data.titleAr = isSkip ? null : val;
      session.step = 'titleAm';
      return ctx.reply(t('ar', 'acp_ask_title_am'));
    }
    if (action === 'edit' && data.titleAm === undefined) {
      data.titleAm = isSkip ? null : val;
      session.step = 'titleEn';
      return ctx.reply(t('ar', 'acp_ask_title_en'));
    }
    if (action === 'edit' && data.titleEn === undefined) {
      data.titleEn = isSkip ? null : val;
      session.step = 'descAr';
      return ctx.reply(t('ar', 'acp_ask_desc_ar'));
    }
    if (action === 'edit' && data.descAr === undefined) {
      data.descAr = isSkip ? null : val;
      session.step = 'descAm';
      return ctx.reply(t('ar', 'acp_ask_desc_am'));
    }
    if (action === 'edit' && data.descAm === undefined) {
      data.descAm = isSkip ? null : val;
      session.step = 'descEn';
      return ctx.reply(t('ar', 'acp_ask_desc_en'));
    }
    if (action === 'edit' && data.descEn === undefined) {
      data.descEn = isSkip ? null : val;
      session.step = 'url';
      return ctx.reply(t('ar', 'acp_ask_url'));
    }
    if (action === 'edit' && data.url === undefined) {
      if (!isSkip && !/^https?:\/\//i.test(val)) return ctx.reply(t('ar', 'acp_ask_url_invalid'));
      data.url = isSkip ? null : val;
      SESSIONS.delete(ctx.from.id);
      await updateResource(resourceId, data);
      return ctx.reply(t('ar', 'acp_saved'));
    }

    // Add wizard
    switch (step) {
      case 'titleAr':
        data.titleAr = val;
        session.step = 'titleAm';
        return ctx.reply(t('ar', 'acp_ask_title_am'));
      case 'titleAm':
        data.titleAm = val;
        session.step = 'titleEn';
        return ctx.reply(t('ar', 'acp_ask_title_en'));
      case 'titleEn':
        data.titleEn = val;
        session.step = 'descAr';
        return ctx.reply(t('ar', 'acp_ask_desc_ar'));
      case 'descAr':
        data.descAr = isSkip ? null : val;
        session.step = 'descAm';
        return ctx.reply(t('ar', 'acp_ask_desc_am'));
      case 'descAm':
        data.descAm = isSkip ? null : val;
        session.step = 'descEn';
        return ctx.reply(t('ar', 'acp_ask_desc_en'));
      case 'descEn':
        data.descEn = isSkip ? null : val;
        session.step = 'url';
        return ctx.reply(t('ar', 'acp_ask_url'));
      case 'url':
        if (!isSkip && !/^https?:\/\//i.test(val)) return ctx.reply(t('ar', 'acp_ask_url_invalid'));
        data.url = isSkip ? null : val;
        session.step = 'teacher';
        return ctx.reply(t('ar', 'acp_ask_teacher'));
      case 'teacher':
        data.teacher = isSkip ? null : val;
        session.step = 'lessonNumber';
        return ctx.reply(t('ar', 'acp_ask_lesson_number'));
      case 'lessonNumber': {
        const n = isSkip ? null : parseInt(val, 10);
        if (!isSkip && (isNaN(n) || n < 0)) return ctx.reply(t('ar', 'acp_ask_lesson_number'));
        data.lessonNumber = n;
        // Ask for parent
        const catId = data.categoryId;
        const parents = await prisma.resource.findMany({
          where: { categoryId: catId, isActive: true },
          orderBy: { sortOrder: 'asc' },
          take: 30,
        });
        const buttons = [
          [Markup.button.callback(t('ar', 'acp_no_parent'), 'acp:newparent:none')],
          ...parents.map((p) => [
            Markup.button.callback(
              `${localize(p, 'title', 'ar').slice(0, 40)}`,
              `acp:newparent:${p.id}`
            ),
          ]),
        ];
        session.step = 'parent';
        return ctx.reply(t('ar', 'acp_ask_parent'), Markup.inlineKeyboard(buttons));
      }
      default:
        return next();
    }
  });

  bot.action(/^acp:newparent:(.+)$/, async (ctx) => {
    const session = SESSIONS.get(ctx.from.id);
    if (!session) return ctx.answerCbQuery();
    const val = ctx.match[1];
    session.data.parentId = val === 'none' ? null : val;
    await ctx.answerCbQuery();
    try {
      await createResource(session.data);
      SESSIONS.delete(ctx.from.id);
      await ctx.reply(t('ar', 'acp_saved'));
    } catch (e) {
      await ctx.reply(`❌ ${e.message}`);
    }
  });
}

async function requireUser(ctx) {
  return { telegramId: ctx.from.id };
}

async function startAdd(ctx) {
  SESSIONS.set(ctx.from.id, { action: 'add', step: 'category', data: {} });
  const cats = await prisma.resourceCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const buttons = cats.map((c) => [
    Markup.button.callback(localize(c, 'title', 'ar'), `acp:newcat:${c.code}`),
  ]);
  await ctx.reply(t('ar', 'acp_choose_category'), Markup.inlineKeyboard(buttons));
}

async function showList(ctx) {
  const cats = await prisma.resourceCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const lines = [];
  for (const c of cats) {
    const items = await prisma.resource.findMany({
      where: { categoryId: c.id, parentId: null },
      orderBy: { sortOrder: 'asc' },
      take: 20,
    });
    lines.push(`\n*${localize(c, 'title', 'ar')}*`);
    for (const r of items) {
      const flag = r.isActive ? '🟢' : '🔴';
      lines.push(`${flag} #${r.id.slice(0, 6)} — ${localize(r, 'title', 'ar')} (${r.type})`);
    }
  }
  const msg = `${t('ar', 'acp_title')}\n${lines.join('\n')}`;
  await ctx.reply(msg, { parse_mode: 'Markdown' });
}

async function showPickFor(ctx, action) {
  const cats = await prisma.resourceCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  const buttons = [];
  for (const c of cats) {
    const items = await prisma.resource.findMany({
      where: { categoryId: c.id },
      orderBy: { sortOrder: 'asc' },
      take: 15,
    });
    for (const r of items) {
      buttons.push([
        Markup.button.callback(
          `${localize(c, 'title', 'ar')} › ${localize(r, 'title', 'ar').slice(0, 30)}`,
          `acp:pick:${action}:${r.id}`
        ),
      ]);
    }
  }
  if (!buttons.length) return ctx.reply(t('ar', 'acp_no_items'));
  await ctx.reply(t('ar', 'acp_title'), Markup.inlineKeyboard(buttons));
}

async function applyAction(ctx, user, action, resourceId) {
  const r = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!r) return ctx.reply(t('ar', 'acp_not_found'));

  switch (action) {
    case 'disable':
      await disableResource(resourceId);
      return ctx.reply(t('ar', 'acp_disabled'));
    case 'enable':
      await enableResource(resourceId);
      return ctx.reply(t('ar', 'acp_enabled'));
    case 'delete':
      await deleteResource(resourceId);
      return ctx.reply(t('ar', 'acp_deleted'));
    case 'reorder': {
      SESSIONS.set(ctx.from.id, {
        action: 'reorder',
        resourceId,
        data: {},
        step: 'reorder',
      });
      return ctx.reply(t('ar', 'acp_ask_new_order'));
    }
    case 'edit': {
      SESSIONS.set(ctx.from.id, {
        action: 'edit',
        resourceId,
        data: {},
        step: 'edit',
      });
      return ctx.reply(t('ar', 'acp_ask_title_ar'));
    }
  }
}