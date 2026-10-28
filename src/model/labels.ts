import { formatDate, monthNames, weekdayNames, type TFn } from '@/i18n';
import type { Lang, Period, Trigger } from './types';
import { daySlots } from './periods';
import { hhmm } from './util';

/** Automatic step name: the date for daily steps, "Week of…" for weekly, the month for monthly… */
export function stepTitle(p: Period, lang: Lang, t: TFn): string {
  const sameYear = p.start.getFullYear() === new Date().getFullYear();
  const day: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) };
  switch (p.triggerType) {
    case 'weekly':
      return t('journey.week', { date: formatDate(p.start, lang, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }) });
    case 'monthly':
      return formatDate(p.start, lang, { month: 'long', year: 'numeric' });
    case 'yearly':
      return String(p.start.getFullYear());
    case 'everyNHours':
    case 'timesPerDay':
      return `${formatDate(p.start, lang, { day: 'numeric', month: 'short' })} · ${hhmm(p.start.getHours(), p.start.getMinutes())}`;
    case 'manual':
      return t('journey.step', { n: p.index });
    default:
      return formatDate(p.start, lang, day);
  }
}

export function shortDate(d: Date, lang: Lang): string {
  return formatDate(d, lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(d: Date, lang: Lang): string {
  return `${formatDate(d, lang, { day: 'numeric', month: 'short' })} ${hhmm(d.getHours(), d.getMinutes())}`;
}

export function triggerSummary(tr: Trigger, lang: Lang, t: TFn): string {
  const at = hhmm(tr.hour ?? 0, tr.minute ?? 0);
  const wd = weekdayNames(lang);
  switch (tr.type) {
    case 'daily':
      return `${t('trigger.daily')} · ${at}`;
    case 'weekly':
      return `${t('trigger.weekly')} · ${wd[tr.weekday ?? 1]} ${at}`;
    case 'monthly':
      return `${t('trigger.monthly')} · ${tr.dayOfMonth ?? 1}`;
    case 'yearly':
      return `${t('trigger.yearly')} · ${tr.dayOfMonth ?? 1} ${monthNames(lang)[tr.month ?? 0]}`;
    case 'everyNHours':
      return t('trigger.summary.everyNHours', { n: tr.everyHours ?? 1, from: hhmm(tr.activeFrom ?? 0, 0), to: hhmm((tr.activeTo ?? 24) % 24, 0) });
    case 'timesPerDay':
      return `${t('trigger.summary.timesPerDay', { n: daySlots(tr).length })} · ${daySlots(tr).map(([h, m]) => hhmm(h, m)).join(', ')}`;
    case 'weekdays':
      return `${(tr.weekdays ?? []).slice().sort().map((d) => wd[d]).join(' · ')} · ${at}`;
    case 'everyNDays':
      return t('trigger.summary.everyNDays', { n: tr.everyDays ?? 1 });
    case 'manual':
      return t('trigger.manual');
  }
}
