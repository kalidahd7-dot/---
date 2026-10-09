import ar from './ar.js';
import am from './am.js';
import en from './en.js';
import { term } from './terminology.js';

const bundles = { ar, am, en };
const FALLBACK_ORDER = ['en', 'ar']; // selected → en → ar
const SUPPORTED = ['ar', 'am', 'en'];

export function supportedLanguages() {
  return SUPPORTED;
}

export function normalizeLang(lang) {
  return SUPPORTED.includes(lang) ? lang : 'ar';
}

export function t(lang, key, vars = {}) {
  const L = normalizeLang(lang);
  let template = bundles[L]?.[key];

  if (!template) {
    for (const fb of FALLBACK_ORDER) {
      if (bundles[fb]?.[key]) {
        template = bundles[fb][key];
        break;
      }
    }
  }

  if (!template) {
    // Never display raw key to user
    return '—';
  }

  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    template
  );
}

export function islamicTerm(key, lang) {
  return term(key, normalizeLang(lang));
}

// Dev-time: verify all keys exist across languages
export function auditTranslations() {
  const all = new Set([
    ...Object.keys(ar),
    ...Object.keys(am),
    ...Object.keys(en),
  ]);
  const missing = { ar: [], am: [], en: [] };
  for (const key of all) {
    if (!(key in ar)) missing.ar.push(key);
    if (!(key in am)) missing.am.push(key);
    if (!(key in en)) missing.en.push(key);
  }
  return missing;
}