import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';
import type { Lang } from '@/model/types';
import { ar, en, type StringKey } from './strings';

export type { StringKey };
export type TFn = (key: StringKey, params?: Record<string, string | number>) => string;

export function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Wraps a value in Unicode first-strong isolate marks so an inserted value in the other script
 * (an English plan name inside an Arabic sentence, a number with a unit) keeps its own order
 * instead of reshuffling the sentence around it.
 */
export function isolate(value: string | number): string {
  return `⁨${value}⁩`;
}

export function makeT(lang: Lang): TFn {
  const dict: Record<string, string> = lang === 'ar' ? ar : en;
  return (key, params) => {
    let s = dict[key] ?? en[key] ?? key;
    if (!params) return s;
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(isolate(v));
    // A leading right-to-left mark fixes the sentence direction to Arabic even when it starts with
    // an inserted English value ("Weight: 92 kg ← 90 kg" would otherwise lay out left-to-right).
    return lang === 'ar' ? `‏${s}` : s;
  };
}

/**
 * The app lays itself out from the chosen language (see `useDir`), so a switch shows at once.
 * The native flag is still kept in step so system UI (alerts, pickers, scroll edges) matches on
 * the next launch.
 */
export const rtl = {
  /** Request the native direction matching `lang`; returns true if it only applies after a restart. */
  apply(lang: Lang): boolean {
    const want = lang === 'ar';
    I18nManager.allowRTL(want);
    I18nManager.forceRTL(want);
    return I18nManager.isRTL !== want;
  },
};

const locale = (lang: Lang) => (lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB');

export function formatDate(d: Date, lang: Lang, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(locale(lang), opts).format(d);
  } catch {
    return d.toDateString();
  }
}

export function weekdayNames(lang: Lang, style: 'short' | 'long' = 'short'): string[] {
  // 2026-10-25 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => formatDate(new Date(2026, 9, 25 + i), lang, { weekday: style }));
}

export function monthNames(lang: Lang): string[] {
  return Array.from({ length: 12 }, (_, i) => formatDate(new Date(2026, i, 1), lang, { month: 'long' }));
}
