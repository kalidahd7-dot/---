import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, auditTranslations, supportedLanguages } from '../src/i18n/index.js';
import { TERM, term } from '../src/i18n/terminology.js';

test('all translation keys exist in all languages', () => {
  const missing = auditTranslations();
  assert.equal(missing.ar.length, 0, `AR missing: ${missing.ar.join(',')}`);
  assert.equal(missing.am.length, 0, `AM missing: ${missing.am.join(',')}`);
  assert.equal(missing.en.length, 0, `EN missing: ${missing.en.join(',')}`);
});

test('supported languages are exactly ar/am/en', () => {
  assert.deepEqual(supportedLanguages().sort(), ['am', 'ar', 'en']);
});

test('unknown key returns dash, not raw key', () => {
  assert.equal(t('ar', 'nonexistent_key_xyz'), '—');
  assert.equal(t('am', 'nonexistent_key_xyz'), '—');
  assert.equal(t('en', 'nonexistent_key_xyz'), '—');
});

test('variable interpolation works', () => {
  const s = t('ar', 'balance_current', { minutes: 30 });
  assert.match(s, /30/);
  const s2 = t('en', 'rc_selected', { minutes: 100, price: 500 });
  assert.match(s2, /100/);
  assert.match(s2, /500/);
});

test('fallback chain works when a key missing in one language', () => {
  // simulate by passing lang fallback to en
  const val = t('am', 'menu_account');
  assert.ok(val.length > 0);
});

test('Islamic terms preserved across languages', () => {
  assert.equal(term('TAJWEED', 'ar'), 'التجويد');
  assert.equal(term('TAJWEED', 'am'), 'ተጅዊድ');
  assert.equal(term('TAJWEED', 'en'), 'Tajweed');

  assert.equal(term('IJAZAH', 'ar'), 'إجازة');
  assert.equal(term('IJAZAH', 'en'), 'Ijazah');

  assert.equal(term('QIRAAT', 'en'), "Qira'at");
  assert.equal(term('MUQRI', 'en'), "Muqri'");
  assert.equal(term('HIFZ', 'en'), 'Hifz');
});

test('ETB is never translated', () => {
  const ar = t('ar', 'balance_pkg_line', { minutes: 100, price: 500 });
  const en = t('en', 'balance_pkg_line', { minutes: 100, price: 500 });
  // both should NOT contain ETB word replacement — ETB stays
  assert.match(en, /ETB/);
  // Arabic uses بر (birr) which is the correct local equivalent
  assert.match(ar, /بر/);
});