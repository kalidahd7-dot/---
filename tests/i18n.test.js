import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, auditTranslations } from '../src/i18n/index.js';

test('all translation keys exist in all languages', () => {
  const missing = auditTranslations();
  assert.equal(missing.ar.length, 0, `AR missing: ${missing.ar.join(',')}`);
  assert.equal(missing.am.length, 0, `AM missing: ${missing.am.join(',')}`);
  assert.equal(missing.en.length, 0, `EN missing: ${missing.en.join(',')}`);
});

test('unknown key returns dash, not raw key', () => {
  assert.equal(t('ar', 'nonexistent_key_xyz'), '—');
});

test('variable interpolation works', () => {
  const s = t('ar', 'balance_current', { minutes: 30 });
  assert.match(s, /30/);
});