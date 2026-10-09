import { Markup } from 'telegraf';
import { t } from '../i18n/index.js';
import { prisma } from '../database.js';
import { findOrCreateUser, generateStudentCode } from '../services/userService.js';
import { applyLedger } from '../services/ledgerService.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { syncTelegramRestriction } from '../services/restrictionService.js';

const SESSIONS = new Map(); // telegramId -> wizard state

const STEPS = [
  'fullName', 'age', 'gender', 'country', 'city', 'phone',
  'readingLevel', 'hasPreviousStudy',
  'prevSchool', 'prevCity', 'prevTeacher', 'prevDuration', 'prevContent',
  'programCode', 'confirm',
];

function nextStep(current) {
  const i = STEPS.indexOf(current);
  return STEPS[i + 1];
}

export function registerRegistrationHandlers(bot) {
  bot.action('register:start', async (ctx) => {
    const user = await findOrCreateUser(ctx.from);
    if (user.student) {
      await ctx.answerCbQuery();
      return ctx.reply(t(user.language, 'reg_confirmed'));
    }
    SESSIONS.set(ctx.from.id, { step: 'fullName', data: { lang: user.language } });
    await ctx.answerCbQuery();
    await ctx.reply(t(user.language, 'reg_ask_fullname'), Markup.removeKeyboard());
  });

  bot.on('text', async (ctx, next) => {
    const st = SESSIONS.get(ctx.from.id);
    if (!st) return next();
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    const text = ctx.message.text.trim();

    if (text === t(lang, 'cancel')) {
      SESSIONS.delete(ctx.from.id);
      return ctx.reply(t(lang, 'reg_cancelled'));
    }

    const step = st.step;

    // Handle current step
    switch (step) {
      case 'fullName':
        st.data.fullName = text;
        st.step = 'age';
        return ctx.reply(t(lang, 'reg_ask_age'));

      case 'age': {
        const age = parseInt(text, 10);
        if (!age || age < 5 || age > 120) return ctx.reply(t(lang, 'reg_ask_age'));
        st.data.age = age;
        st.step = 'gender';
        return ctx.reply(t(lang, 'reg_ask_gender'), Markup.keyboard([
          [t(lang, 'gender_male'), t(lang, 'gender_female')],
        ]).resize());
      }

      case 'gender': {
        if (text === t(lang, 'gender_male')) st.data.gender = 'MALE';
        else if (text === t(lang, 'gender_female')) st.data.gender = 'FEMALE';
        else return ctx.reply(t(lang, 'reg_ask_gender'));
        st.step = 'country';
        return ctx.reply(t(lang, 'reg_ask_country'), Markup.removeKeyboard());
      }

      case 'country':
        st.data.country = text;
        st.step = 'city';
        return ctx.reply(t(lang, 'reg_ask_city'));

      case 'city':
        st.data.city = text;
        st.step = 'phone';
        return ctx.reply(t(lang, 'reg_ask_phone'));

      case 'phone':
        st.data.phone = text;
        st.step = 'readingLevel';
        return ctx.reply(t(lang, 'reg_ask_level'), Markup.keyboard([
          [t(lang, 'level_beginner')],
          [t(lang, 'level_intermediate')],
          [t(lang, 'level_advanced')],
        ]).resize());

      case 'readingLevel': {
        const map = {
          [t(lang, 'level_beginner')]: 'BEGINNER',
          [t(lang, 'level_intermediate')]: 'INTERMEDIATE',
          [t(lang, 'level_advanced')]: 'ADVANCED',
        };
        if (!map[text]) return ctx.reply(t(lang, 'reg_ask_level'));
        st.data.readingLevel = map[text];
        st.step = 'hasPreviousStudy';
        return ctx.reply(t(lang, 'reg_ask_prev_study'), Markup.keyboard([
          [t(lang, 'yes'), t(lang, 'no')],
        ]).resize());
      }

      case 'hasPreviousStudy': {
        if (text === t(lang, 'yes')) {
          st.data.hasPreviousStudy = true;
          st.step = 'prevSchool';
          return ctx.reply(t(lang, 'reg_prev_school'));
        }
        if (text === t(lang, 'no')) {
          st.data.hasPreviousStudy = false;
          st.step = 'programCode';
          return askProgram(ctx, lang);
        }
        return ctx.reply(t(lang, 'reg_ask_prev_study'));
      }

      case 'prevSchool': st.data.prevSchool = text; st.step = 'prevCity'; return ctx.reply(t(lang, 'reg_prev_city'));
      case 'prevCity':   st.data.prevCity = text;   st.step = 'prevTeacher'; return ctx.reply(t(lang, 'reg_prev_teacher'));
      case 'prevTeacher':st.data.prevTeacher = text;st.step = 'prevDuration'; return ctx.reply(t(lang, 'reg_prev_duration'));
      case 'prevDuration': st.data.prevDuration = text; st.step = 'prevContent'; return ctx.reply(t(lang, 'reg_prev_content'));
      case 'prevContent':
        st.data.prevContent = text;
        st.step = 'programCode';
        return askProgram(ctx, lang);

      case 'programCode': {
        // handled by action callbacks below; text fallback
        return ctx.reply(t(lang, 'reg_ask_program'));
      }

      default:
        return next();
    }
  });

  // Program selection via callback
  bot.action(/^regprog:(TALQIN|HIFZ|IJAZAH_HAFS)$/, async (ctx) => {
    const st = SESSIONS.get(ctx.from.id);
    if (!st) return ctx.answerCbQuery();
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;
    st.data.programCode = ctx.match[1];
    st.step = 'confirm';
    const summary = buildSummary(lang, st.data);
    await ctx.answerCbQuery();
    await ctx.editMessageText(`${t(lang, 'reg_confirm')}\n\n${summary}`, Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, 'confirm'), 'regconfirm:yes')],
      [Markup.button.callback(t(lang, 'cancel'), 'regconfirm:no')],
    ]));
  });

  bot.action(/^regconfirm:(yes|no)$/, async (ctx) => {
    const st = SESSIONS.get(ctx.from.id);
    if (!st) return ctx.answerCbQuery();
    const user = await findOrCreateUser(ctx.from);
    const lang = user.language;

    if (ctx.match[1] === 'no') {
      SESSIONS.delete(ctx.from.id);
      await ctx.answerCbQuery();
      return ctx.editMessageText(t(lang, 'reg_cancelled'));
    }

    try {
      const result = await persistRegistration(user, st.data);
      SESSIONS.delete(ctx.from.id);
      await ctx.answerCbQuery();
      await ctx.editMessageText(t(lang, 'reg_confirmed'));

      // Welcome bonus
      await prisma.$transaction(async (tx) => {
        await applyLedger(tx, {
          studentId: result.student.id,
          type: 'WELCOME_BONUS',
          amountMinutes: config.rules.welcomeBonusMinutes,
          reference: 'WELCOME',
        });
        await tx.student.update({
          where: { id: result.student.id },
          data: { totalFree: config.rules.welcomeBonusMinutes },
        });
      });

      await ctx.reply(
        `${t(lang, 'welcome_bonus_title')}\n\n${t(lang, 'welcome_bonus_body', {
          minutes: config.rules.welcomeBonusMinutes,
        })}`
      );

      // Add student to his Telegram group if we have chat id
      const group = await prisma.group.findUnique({ where: { id: result.student.groupId } });
      if (group?.telegramId) {
        try {
          await bot.telegram.unbanChatMember(group.telegramId.toString(), ctx.from.id);
        } catch {}
      }
    } catch (e) {
      logger.error({ e: e.message }, 'registration failed');
      await ctx.reply(t(lang, 'error_generic'));
    }
  });
}

async function askProgram(ctx, lang) {
  const programs = await prisma.program.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  const buttons = programs.map((p) => {
    const title = lang === 'ar' ? p.titleAr : lang === 'am' ? p.titleAm : p.titleEn;
    return [Markup.button.callback(title, `regprog:${p.code}`)];
  });
  await ctx.reply(t(lang, 'reg_ask_program'), Markup.inlineKeyboard(buttons));
}

function buildSummary(lang, d) {
  const lines = [
    `👤 ${d.fullName}`,
    `🎂 ${d.age}`,
    `⚧ ${d.gender === 'MALE' ? t(lang, 'gender_male') : t(lang, 'gender_female')}`,
    `🌍 ${d.country} / ${d.city}`,
    `📞 ${d.phone}`,
    `📖 ${d.readingLevel}`,
    `🎓 ${d.programCode}`,
  ];
  return lines.join('\n');
}

async function persistRegistration(user, d) {
  const program = await prisma.program.findUnique({ where: { code: d.programCode } });
  if (!program) throw new Error('PROGRAM_NOT_FOUND');

  const group = await pickGroupFor(d.gender);

  const code = await generateStudentCode();

  const student = await prisma.student.create({
    data: {
      userId: user.id,
      code,
      fullName: d.fullName,
      age: d.age,
      gender: d.gender,
      country: d.country,
      city: d.city,
      phone: d.phone,
      readingLevel: d.readingLevel,
      hasPreviousStudy: !!d.hasPreviousStudy,
      prevSchool: d.prevSchool,
      prevCity: d.prevCity,
      prevTeacher: d.prevTeacher,
      prevDuration: d.prevDuration,
      prevContent: d.prevContent,
      programId: program.id,
      groupId: group?.id,
      period: group?.period,
      enrollmentStatus: 'ACTIVE',
      examFrequency: 'WEEKLY',
      examAmount: 'J5',
    },
  });

  return { student };
}

async function pickGroupFor(gender) {
  // pick the morning group of the corresponding gender as default
  const code = gender === 'MALE' ? 'MALE_MORNING' : 'FEMALE_MORNING';
  return prisma.group.findUnique({ where: { code } });
}