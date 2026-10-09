import 'dotenv/config';

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`❌ Missing required env: ${name}`);
  return v;
}

function int(name, def) {
  const v = process.env[name];
  return v ? parseInt(v, 10) : def;
}

function bigintList(name) {
  return (process.env[name] || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => BigInt(s));
}

export const config = {
  bot: {
    token: req('BOT_TOKEN'),
    adminIds: bigintList('ADMIN_TELEGRAM_IDS'),
    supervisorGroupId: process.env.SUPERVISOR_GROUP_ID ? BigInt(process.env.SUPERVISOR_GROUP_ID) : null,
  },
  db: {
    url: req('DATABASE_URL'),
  },
  timezone: process.env.TZ || 'Africa/Addis_Ababa',
  rules: {
    pricePerMinuteEtb: int('PRICE_PER_MINUTE_ETB', 5),
    maxLoanMinutes: int('MAX_LOAN_MINUTES', 100),
    welcomeBonusMinutes: int('WELCOME_BONUS_MINUTES', 30),
    examOverdueDays: int('EXAM_OVERDUE_DAYS', 3),
  },
  payment: {
    telebirrNumber: process.env.TELEBIRR_NUMBER || '',
    telebirrAccountNameAr: process.env.TELEBIRR_ACCOUNT_NAME_AR || '',
    telebirrAccountNameEn: process.env.TELEBIRR_ACCOUNT_NAME_EN || '',
    bankName: process.env.BANK_NAME || '',
    bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
    bankAccountName: process.env.BANK_ACCOUNT_NAME || '',
  },
  groups: {
    MALE_MORNING:     process.env.GROUP_MALE_MORNING_ID     ? BigInt(process.env.GROUP_MALE_MORNING_ID)     : null,
    MALE_AFTERNOON:   process.env.GROUP_MALE_AFTERNOON_ID   ? BigInt(process.env.GROUP_MALE_AFTERNOON_ID)   : null,
    MALE_NIGHT:       process.env.GROUP_MALE_NIGHT_ID       ? BigInt(process.env.GROUP_MALE_NIGHT_ID)       : null,
    FEMALE_MORNING:   process.env.GROUP_FEMALE_MORNING_ID   ? BigInt(process.env.GROUP_FEMALE_MORNING_ID)   : null,
    FEMALE_AFTERNOON: process.env.GROUP_FEMALE_AFTERNOON_ID ? BigInt(process.env.GROUP_FEMALE_AFTERNOON_ID) : null,
    FEMALE_NIGHT:     process.env.GROUP_FEMALE_NIGHT_ID     ? BigInt(process.env.GROUP_FEMALE_NIGHT_ID)     : null,
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};