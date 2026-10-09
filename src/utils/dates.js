import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { config } from '../config.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export function now() {
  return dayjs().tz(config.timezone);
}

export function toTz(d) {
  return dayjs(d).tz(config.timezone);
}

export function formatDate(d, lang = 'en') {
  const map = { ar: 'ar', am: 'am', en: 'en' };
  return toTz(d).locale(map[lang] || 'en').format('YYYY-MM-DD HH:mm');
}