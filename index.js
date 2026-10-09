'use strict';
require('dotenv').config();
const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const { Pool } = require('pg');
const { t } = require('./locales');
const { SCHEDULES } = require('./schedules');

const required = ['BOT_TOKEN', 'DATABASE_URL'];
for (const key of required) if (!process.env[key]) console.error(`Missing required environment variable: ${key}`);
if (!process.env.BOT_TOKEN || !process.env.DATABASE_URL) process.exit(1);

const bot = new Telegraf(process.env.BOT_TOKEN);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_IDS = new Set((process.env.ADMIN_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID || '';
const BONUS = Math.max(0, Number(process.env.WELCOME_BONUS_MINUTES || 30));
const MINUTE_PRICE = Math.max(1, Number(process.env.MINUTE_PRICE_ETB || 5));
const TIMEZONE = process.env.TIMEZONE || 'Africa/Addis_Ababa';
const states = new Map();
const packages = [
  { minutes: 100, price: 500 }, { minutes: 200, price: 1000 }, { minutes: 300, price: 1470 },
  { minutes: 400, price: 1920 }, { minutes: 500, price: 2350 }, { minutes: 600, price: 2760 }, { minutes: 1000, price: 4500 }
];
const methodInfo = {
  telebirr: { label: 'Telebirr', type: 'wallet', details: process.env.TELEBIRR_NUMBER || '0990161371' },
  mpesa: { label: 'M-Pesa', type: 'wallet', details: process.env.MPESA_NUMBER || '0721009122' },
  boa: { label: 'BOA', type: 'bank', details: process.env.BOA_ACCOUNT || '226626646' },
  cbe: { label: 'CBE', type: 'bank', details: process.env.CBE_ACCOUNT || '1000285374425' }
};
const accountName = process.env.PAYMENT_ACCOUNT_NAME || 'خالد أحمد مصطفى / Khalid Ahmed Mustafa';

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY, username TEXT, language TEXT NOT NULL DEFAULT 'ar', full_name TEXT,
    student_code TEXT UNIQUE, balance INTEGER NOT NULL DEFAULT 0, total_purchased INTEGER NOT NULL DEFAULT 0,
    total_used INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS balance_ledger (
    id BIGSERIAL PRIMARY KEY, telegram_id BIGINT NOT NULL REFERENCES users(telegram_id), transaction_type TEXT NOT NULL,
    amount INTEGER NOT NULL, previous_balance INTEGER NOT NULL, new_balance INTEGER NOT NULL, actor TEXT NOT NULL,
    reference TEXT, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS payment_requests (
    id BIGSERIAL PRIMARY KEY, request_code TEXT UNIQUE NOT NULL, telegram_id BIGINT NOT NULL REFERENCES users(telegram_id),
    minutes INTEGER NOT NULL, price INTEGER NOT NULL, method TEXT NOT NULL, receipt_file_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', reviewed_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reviewed_at TIMESTAMPTZ
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY, telegram_id BIGINT NOT NULL REFERENCES users(telegram_id), minutes INTEGER NOT NULL,
    previous_balance INTEGER NOT NULL, new_balance INTEGER NOT NULL, supervisor_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT, details JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  // Safe additive migrations for older versions of this small project.
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT \'ar\'');
}

async function audit(actor, action, target = null, details = {}) {
  await pool.query('INSERT INTO audit_logs(actor, action, target, details) VALUES($1,$2,$3,$4)', [String(actor), action, target, JSON.stringify(details)]);
}
async function getUser(id) {
  const r = await pool.query('SELECT * FROM users WHERE telegram_id=$1', [String(id)]);
  return r.rows[0] || null;
}
async function ensureUser(ctx, language) {
  const id = String(ctx.from.id);
  const username = ctx.from.username || null;
  await pool.query(`INSERT INTO users(telegram_id, username, language) VALUES($1,$2,$3)
    ON CONFLICT(telegram_id) DO UPDATE SET username=EXCLUDED.username, updated_at=NOW()`, [id, username, language || 'ar']);
  return getUser(id);
}
function isAdmin(ctx) { return ADMIN_IDS.has(String(ctx.from?.id)); }
function keyboardMain(lang) {
  return Markup.keyboard([
    [t(lang, 'my_account'), t(lang, 'balance')],
    [t(lang, 'program'), t(lang, 'sessions')],
    [t(lang, 'schedule'), t(lang, 'settings')],
    [t(lang, 'contact')]
  ]).resize();
}
function languageKeyboard() {
  return Markup.inlineKeyboard([[Markup.button.callback('🇸🇦 العربية', 'lang:ar')], [Markup.button.callback('🇪🇹 አማርኛ', 'lang:am')], [Markup.button.callback('🇺🇸 English', 'lang:en')]]);
}
function packageKeyboard(lang) {
  return Markup.inlineKeyboard(packages.map(p => [Markup.button.callback(`${p.minutes} min — ${p.price} ETB`, `pkg:${p.minutes}`)]));
}
function methodCategoryKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'wallet'), 'paycat:wallet')],
    [Markup.button.callback(t(lang, 'bank'), 'paycat:bank')]
  ]);
}
function methodKeyboard(type, lang) {
  const entries = Object.entries(methodInfo).filter(([,v]) => v.type === type);
  return Markup.inlineKeyboard(entries.map(([key, value]) => [Markup.button.callback(value.label, `method:${key}`)]));
}
function formatAccount(user) {
  return t(user.language, 'account', { code: user.student_code || '—', name: user.full_name || '—', balance: user.balance, purchased: user.total_purchased, used: user.total_used });
}
async function createStudent(ctx, fullName, language) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM users WHERE telegram_id=$1 FOR UPDATE', [String(ctx.from.id)]);
    if (!existing.rows.length) throw new Error('User disappeared during registration');
    let user = existing.rows[0];
    if (user.student_code) { await client.query('COMMIT'); return user; }
    const seq = await client.query("SELECT COALESCE(MAX(id),0)+1 AS n FROM (SELECT id FROM balance_ledger) x");
    const codeCount = await client.query('SELECT COUNT(*)::int AS n FROM users WHERE student_code IS NOT NULL');
    const code = `IF-${String(codeCount.rows[0].n + 1).padStart(4, '0')}`;
    const upd = await client.query('UPDATE users SET full_name=$2, student_code=$3, language=$4, balance=$5, updated_at=NOW() WHERE telegram_id=$1 RETURNING *', [String(ctx.from.id), fullName.trim(), code, language, BONUS]);
    user = upd.rows[0];
    await client.query(`INSERT INTO balance_ledger(telegram_id, transaction_type, amount, previous_balance, new_balance, actor, reference, note)
      VALUES($1,'WELCOME_BONUS',$2,0,$2,'SYSTEM',$3,'Welcome bonus')`, [String(ctx.from.id), BONUS, code]);
    await client.query('COMMIT');
    await audit(ctx.from.id, 'STUDENT_REGISTERED', code, { language, welcomeBonus: BONUS });
    return user;
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}
async function sendAdminNotification(text, receiptFileId) {
  if (!ADMIN_GROUP_ID) return;
  try {
    await bot.telegram.sendMessage(ADMIN_GROUP_ID, text);
    if (receiptFileId) await bot.telegram.sendDocument(ADMIN_GROUP_ID, receiptFileId, { caption: 'Payment receipt attached to the pending request above.' });
  } catch (e) { console.error('Could not notify admin group:', e.message); }
}
async function startRecharge(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user?.student_code) { states.set(String(ctx.from.id), { type: 'register_name', language: user?.language || 'ar' }); return ctx.reply(t(user?.language || 'ar', 'ask_name')); }
  states.set(String(ctx.from.id), { type: 'choose_package' });
  return ctx.reply(t(user.language, 'choose_package'), packageKeyboard(user.language));
}

bot.start(async ctx => {
  try {
    const user = await getUser(ctx.from.id);
    if (user?.student_code) return ctx.reply(t(user.language, 'welcome'), keyboardMain(user.language));
    await ensureUser(ctx, user?.language || 'ar');
    states.set(String(ctx.from.id), { type: 'choose_language' });
    return ctx.reply('🌐 اختر اللغة / ቋንቋ ይምረጡ / Choose your language', languageKeyboard());
  } catch (e) { console.error(e); return ctx.reply(t('ar', 'generic_error')); }
});

bot.command('language', async ctx => ctx.reply(t((await getUser(ctx.from.id))?.language || 'ar', 'choose_language'), languageKeyboard()));
bot.command('cancel', async ctx => { states.delete(String(ctx.from.id)); const u = await getUser(ctx.from.id); return ctx.reply(t(u?.language || 'ar', 'cancelled'), u?.student_code ? keyboardMain(u.language) : undefined); });
bot.action(/^lang:(ar|am|en)$/, async ctx => {
  try {
    const lang = ctx.match[1]; await ensureUser(ctx, lang);
    await pool.query('UPDATE users SET language=$2, updated_at=NOW() WHERE telegram_id=$1', [String(ctx.from.id), lang]);
    const user = await getUser(ctx.from.id); const state = states.get(String(ctx.from.id));
    await ctx.answerCbQuery();
    if (!user.student_code) { states.set(String(ctx.from.id), { type: 'register_name', language: lang }); return ctx.reply(t(lang, 'ask_name')); }
    states.delete(String(ctx.from.id)); return ctx.reply(`${t(lang, 'language_saved')}\n\n${t(lang, 'welcome')}`, keyboardMain(lang));
  } catch (e) { console.error(e); ctx.reply(t('ar', 'generic_error')); }
});

bot.hears(/^(👤 حسابي|👤 የእኔ መለያ|👤 My Account)$/, async ctx => { const u = await getUser(ctx.from.id); return ctx.reply(u?.student_code ? formatAccount(u) : t(u?.language || 'ar', 'no_account'), { parse_mode: 'Markdown' }); });
bot.hears(/^(💳 الرصيد والتعبئة|💳 ቀሪ ሂሳብ እና መሙያ|💳 Balance & Recharge)$/, startRecharge);
bot.hears(/^(📖 برنامجي|📖 ፕሮግራሜ|📖 My Program)$/, async ctx => { const u = await getUser(ctx.from.id); return ctx.reply(t(u?.language || 'ar', 'program_info')); });
bot.hears(/^(⏱️ جلساتي|⏱️ የንባብ ክፍለ ጊዜዎቼ|⏱️ My Sessions)$/, async ctx => { const u = await getUser(ctx.from.id); return ctx.reply(t(u?.language || 'ar', 'sessions_info')); });
bot.hears(/^(📅 جدولي|📅 የጊዜ ሰሌዳዬ|📅 My Schedule)$/, async ctx => { const u = await getUser(ctx.from.id); return ctx.reply(t(u?.language || 'ar', 'schedule_info')); });
bot.hears(/^(⚙️ الإعدادات|⚙️ ቅንብሮች|⚙️ Settings)$/, async ctx => { const u = await getUser(ctx.from.id); return ctx.reply(t(u?.language || 'ar', 'settings_info')); });
bot.hears(/^(☎️ التواصل مع الإدارة|☎️ አስተዳደሩን ያግኙ|☎️ Contact Administration)$/, async ctx => { const u = await getUser(ctx.from.id); return ctx.reply(`📞 +251990161372\n✉️ khdahd241@gmail.com\n🔗 https://t.me/quran_241`); });

bot.action(/^pkg:(\d+)$/, async ctx => {
  const minutes = Number(ctx.match[1]); const pkg = packages.find(p => p.minutes === minutes); const u = await getUser(ctx.from.id);
  if (!pkg || !u) { await ctx.answerCbQuery(); return ctx.reply(t(u?.language || 'ar', 'unknown_package')); }
  states.set(String(ctx.from.id), { type: 'choose_method_category', package: pkg });
  await ctx.answerCbQuery(); return ctx.reply(t(u.language, 'choose_method'), methodCategoryKeyboard(u.language));
});
bot.action(/^paycat:(wallet|bank)$/, async ctx => {
  const state = states.get(String(ctx.from.id)); const u = await getUser(ctx.from.id);
  if (!state?.package || !u) { await ctx.answerCbQuery(); return ctx.reply(t(u?.language || 'ar', 'generic_error')); }
  state.type = 'choose_method'; state.methodType = ctx.match[1]; states.set(String(ctx.from.id), state);
  await ctx.answerCbQuery(); return ctx.reply(t(u.language, 'payment_methods'), methodKeyboard(state.methodType, u.language));
});
bot.action(/^method:(telebirr|mpesa|boa|cbe)$/, async ctx => {
  const state = states.get(String(ctx.from.id)); const u = await getUser(ctx.from.id); const method = methodInfo[ctx.match[1]];
  if (!state?.package || !method || !u) { await ctx.answerCbQuery(); return ctx.reply(t(u?.language || 'ar', 'generic_error')); }
  state.type = 'awaiting_receipt'; state.method = ctx.match[1]; states.set(String(ctx.from.id), state);
  await ctx.answerCbQuery();
  const detailText = t(u.language, 'payment_details', { method: method.label, accountName, details: method.details, minutes: state.package.minutes, price: state.package.price });
  await ctx.reply(detailText, { parse_mode: 'Markdown' });
  return ctx.reply(t(u.language, 'send_receipt'));
});

bot.on(['photo', 'document'], async ctx => {
  const state = states.get(String(ctx.from.id));
  if (!state || state.type !== 'awaiting_receipt') return;
  const user = await getUser(ctx.from.id); if (!user?.student_code) return ctx.reply(t(user?.language || 'ar', 'no_account'));
  const fileId = ctx.message.photo ? ctx.message.photo[ctx.message.photo.length - 1].file_id : ctx.message.document.file_id;
  if (ctx.message.document && !['application/pdf', 'image/jpeg', 'image/png'].includes(ctx.message.document.mime_type || '')) return ctx.reply(t(user.language, 'receipt_prompt'));
  try {
    const client = await pool.connect(); let request;
    try {
      await client.query('BEGIN');
      const ins = await client.query(`INSERT INTO payment_requests(request_code, telegram_id, minutes, price, method, receipt_file_id)
        VALUES('TEMP-' || txid_current(),$1,$2,$3,$4,$5) RETURNING *`, [String(ctx.from.id), state.package.minutes, state.package.price, state.method, fileId]);
      request = ins.rows[0];
      const requestCode = `TOP-${String(request.id).padStart(6, '0')}`;
      const updated = await client.query('UPDATE payment_requests SET request_code=$2 WHERE id=$1 RETURNING *', [request.id, requestCode]); request = updated.rows[0];
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    states.delete(String(ctx.from.id));
    await ctx.reply(t(user.language, 'receipt_received', { id: request.request_code }), keyboardMain(user.language));
    await sendAdminNotification(t('ar', 'admin_payment', { id: request.request_code, code: user.student_code, name: user.full_name, minutes: request.minutes, price: request.price, method: methodInfo[state.method].label }), fileId);
    await audit(ctx.from.id, 'PAYMENT_REQUEST_CREATED', request.request_code, { minutes: request.minutes, price: request.price, method: state.method });
  } catch (e) { console.error(e); return ctx.reply(t(user.language, 'generic_error')); }
});

bot.command('approve', async ctx => {
  if (!isAdmin(ctx)) return ctx.reply(t((await getUser(ctx.from.id))?.language || 'ar', 'unauthorized'));
  const code = (ctx.message.text.split(/\s+/)[1] || '').toUpperCase(); if (!/^TOP-\d{6}$/.test(code)) return ctx.reply('Usage: /approve TOP-000001');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('SELECT * FROM payment_requests WHERE request_code=$1 FOR UPDATE', [code]);
    if (!r.rows.length) { await client.query('ROLLBACK'); return ctx.reply('Payment request not found.'); }
    const req = r.rows[0];
    if (req.status !== 'PENDING') { await client.query('ROLLBACK'); return ctx.reply(`Request ${code} is already ${req.status}. No duplicate credit was added.`); }
    const ur = await client.query('SELECT * FROM users WHERE telegram_id=$1 FOR UPDATE', [String(req.telegram_id)]); const u = ur.rows[0];
    const before = Number(u.balance); const after = before + Number(req.minutes);
    await client.query('UPDATE users SET balance=$2,total_purchased=total_purchased+$3,updated_at=NOW() WHERE telegram_id=$1', [String(req.telegram_id), after, req.minutes]);
    await client.query(`INSERT INTO balance_ledger(telegram_id,transaction_type,amount,previous_balance,new_balance,actor,reference,note) VALUES($1,'PACKAGE_PURCHASE',$2,$3,$4,$5,$6,$7)`, [String(req.telegram_id), req.minutes, before, after, String(ctx.from.id), code, `${req.price} ETB via ${req.method}`]);
    await client.query("UPDATE payment_requests SET status='APPROVED',reviewed_by=$2,reviewed_at=NOW() WHERE id=$1", [req.id, String(ctx.from.id)]);
    await client.query('COMMIT');
    const user = await getUser(req.telegram_id);
    await bot.telegram.sendMessage(String(req.telegram_id), t(user.language, 'recharge_ok', { minutes: req.minutes, balance: after }));
    await ctx.reply(t('ar', 'approved', { id: code, minutes: req.minutes })); await audit(ctx.from.id, 'PAYMENT_APPROVED', code, { minutes: req.minutes });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error(e); return ctx.reply('Could not approve this request. Check logs and database.'); }
  finally { client.release(); }
});

bot.command('reject', async ctx => {
  if (!isAdmin(ctx)) return ctx.reply(t((await getUser(ctx.from.id))?.language || 'ar', 'unauthorized'));
  const code = (ctx.message.text.split(/\s+/)[1] || '').toUpperCase(); if (!/^TOP-\d{6}$/.test(code)) return ctx.reply('Usage: /reject TOP-000001');
  const r = await pool.query("UPDATE payment_requests SET status='REJECTED',reviewed_by=$2,reviewed_at=NOW() WHERE request_code=$1 AND status='PENDING' RETURNING *", [code, String(ctx.from.id)]);
  if (!r.rows.length) return ctx.reply('Request not found or already reviewed.');
  const req = r.rows[0], u = await getUser(req.telegram_id);
  await bot.telegram.sendMessage(String(req.telegram_id), t(u.language, 'rejected', { id: code }));
  await ctx.reply(`Request ${code} rejected.`); await audit(ctx.from.id, 'PAYMENT_REJECTED', code);
});

bot.command('deduct', async ctx => {
  if (!isAdmin(ctx)) return ctx.reply(t((await getUser(ctx.from.id))?.language || 'ar', 'unauthorized'));
  const [, code, rawMinutes] = ctx.message.text.trim().split(/\s+/); const minutes = Number(rawMinutes);
  if (!code || !Number.isInteger(minutes) || minutes < 1 || minutes > 600) return ctx.reply(t('ar', 'bad_command'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); const r = await client.query('SELECT * FROM users WHERE student_code=$1 FOR UPDATE', [code.toUpperCase()]);
    if (!r.rows.length) { await client.query('ROLLBACK'); return ctx.reply('Student not found.'); }
    const u = r.rows[0], before = Number(u.balance); const loanLimit = Math.max(0, Number(process.env.MAX_LOAN_MINUTES || 100));
    if (before - minutes < -loanLimit) { await client.query('ROLLBACK'); return ctx.reply(`Cannot deduct: this would exceed the configured loan limit of ${loanLimit} minutes.`); }
    const after = before - minutes;
    await client.query('UPDATE users SET balance=$2,total_used=total_used+$3,updated_at=NOW() WHERE telegram_id=$1', [String(u.telegram_id), after, minutes]);
    await client.query('INSERT INTO sessions(telegram_id,minutes,previous_balance,new_balance,supervisor_id) VALUES($1,$2,$3,$4,$5)', [String(u.telegram_id), minutes, before, after, String(ctx.from.id)]);
    await client.query(`INSERT INTO balance_ledger(telegram_id,transaction_type,amount,previous_balance,new_balance,actor,reference,note) VALUES($1,'SESSION_DEDUCTION',$2,$3,$4,$5,$6,'Session deduction')`, [String(u.telegram_id), -minutes, before, after, String(ctx.from.id), code.toUpperCase()]);
    await client.query('COMMIT'); await bot.telegram.sendMessage(String(u.telegram_id), t(u.language, 'deducted', { used: minutes, before, after }));
    return ctx.reply(`Session recorded for ${code.toUpperCase()}. ${minutes} min deducted; balance ${after} min.`);
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error(e); return ctx.reply('Could not record the session.'); }
  finally { client.release(); }
});

bot.command('balance', async ctx => {
  if (!isAdmin(ctx)) return ctx.reply(t((await getUser(ctx.from.id))?.language || 'ar', 'unauthorized'));
  const code = (ctx.message.text.split(/\s+/)[1] || '').toUpperCase(); const r = await pool.query('SELECT * FROM users WHERE student_code=$1', [code]);
  if (!r.rows.length) return ctx.reply('Student not found.'); const u = r.rows[0]; return ctx.reply(`${u.student_code} — ${u.full_name}\nBalance: ${u.balance} min\nPurchased: ${u.total_purchased} min\nUsed: ${u.total_used} min`);
});

bot.command('broadcast', async ctx => {
  if (!isAdmin(ctx)) return ctx.reply(t((await getUser(ctx.from.id))?.language || 'ar', 'unauthorized'));
  const body = ctx.message.text.replace(/^\/broadcast(?:@\w+)?\s*/, '').trim();
  if (!body) { states.set(String(ctx.from.id), { type: 'broadcast' }); return ctx.reply(t((await getUser(ctx.from.id))?.language || 'ar', 'broadcast_prompt')); }
  await doBroadcast(ctx, body);
});
async function doBroadcast(ctx, body) {
  const rows = await pool.query('SELECT telegram_id FROM users'); let sent = 0, failed = 0;
  for (const row of rows.rows) { try { await bot.telegram.sendMessage(String(row.telegram_id), body); sent++; } catch { failed++; } }
  states.delete(String(ctx.from.id)); await ctx.reply(t((await getUser(ctx.from.id))?.language || 'ar', 'broadcast_done', { sent, failed })); await audit(ctx.from.id, 'BROADCAST', null, { sent, failed });
}

bot.on('text', async ctx => {
  const key = String(ctx.from.id), state = states.get(key), user = await getUser(ctx.from.id);
  if (!state) return;
  if (state.type === 'register_name') {
    const name = ctx.message.text.trim(); if (name.length < 3 || name.length > 100) return ctx.reply(t(state.language || user?.language || 'ar', 'ask_name'));
    try { const created = await createStudent(ctx, name, state.language || user?.language || 'ar'); states.delete(key); return ctx.reply(t(created.language, 'registered', { code: created.student_code, bonus: BONUS }), keyboardMain(created.language)); }
    catch (e) { console.error(e); return ctx.reply(t(state.language || 'ar', 'generic_error')); }
  }
  if (state.type === 'broadcast' && isAdmin(ctx)) return doBroadcast(ctx, ctx.message.text);
  if (state.type === 'awaiting_receipt') return ctx.reply(t(user?.language || 'ar', 'receipt_prompt'));
});

bot.catch((err, ctx) => { console.error('Telegram handler error:', err); if (ctx?.reply) ctx.reply(t('ar', 'generic_error')).catch(() => {}); });
app.get('/', (_req, res) => res.status(200).send('Imam Al-Jazari Telegram Bot is running.'));
app.get('/health', async (_req, res) => { try { await pool.query('SELECT 1'); res.status(200).json({ ok: true, service: 'imam-aljazari-bot', timezone: TIMEZONE }); } catch { res.status(503).json({ ok: false, database: 'unavailable' }); } });

async function main() {
  await initDb();
  app.listen(PORT, () => console.log(`Health server listening on port ${PORT}; timezone=${TIMEZONE}; schedule groups=${SCHEDULES.length}`));
  await bot.launch(); console.log('Telegram bot launched.');
}
main().catch(err => { console.error('Startup failed:', err); process.exit(1); });
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
