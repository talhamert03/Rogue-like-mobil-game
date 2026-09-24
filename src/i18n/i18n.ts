export type Lang = 'tr' | 'en';

/** A localized string. */
export interface LStr {
  tr: string;
  en: string;
}

export const L = (tr: string, en: string): LStr => ({ tr, en });

let current: Lang = 'tr';
const listeners: (() => void)[] = [];

export function setLang(lang: Lang): void {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((f) => f());
}

export function getLang(): Lang {
  return current;
}

export function onLangChange(f: () => void): void {
  listeners.push(f);
}

/** Resolve a localized string and substitute {placeholders}. */
export function t(s: LStr | string | undefined, vars?: Record<string, string | number>): string {
  if (s === undefined) return '';
  let out = typeof s === 'string' ? s : s[current] ?? s.en;
  if (vars) {
    for (const k in vars) out = out.split(`{${k}}`).join(String(vars[k]));
  }
  return out;
}

/** Turkish-aware upper-case. */
export function upper(s: string): string {
  return current === 'tr' ? s.toLocaleUpperCase('tr-TR') : s.toUpperCase();
}
