import type { FieldValue, Period, Plan, Status, StepRecord, TemplateField } from './types';

/** Fields a step uses: its own snapshot if it has been filled, otherwise the template in force when it ended. */
export function fieldsFor(plan: Plan, period: Period, now: Date = new Date()): TemplateField[] {
  const rec = plan.records[period.key];
  if (rec) return rec.fields;
  const cutoff = (period.end && period.end < now ? period.end : now).toISOString();
  const versions = [...plan.templates].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  let chosen = versions[0];
  for (const v of versions) if (v.effectiveFrom <= cutoff) chosen = v;
  return chosen?.fields ?? [];
}

export function checklistItems(field: TemplateField, value?: FieldValue) {
  return [...(field.items ?? []), ...(value?.extraItems ?? [])];
}

/** 0–1 completion for a measurable field, or null if the field isn't measurable. */
export function fieldCompletion(field: TemplateField, value?: FieldValue): number | null {
  switch (field.type) {
    case 'checklist': {
      const items = checklistItems(field, value);
      if (!items.length) return null;
      const done = items.filter((i) => value?.checks?.[i.id]).length;
      return done / items.length;
    }
    case 'number': {
      if (!field.target || field.target <= 0) return null;
      const n = value?.number ?? 0;
      return Math.max(0, Math.min(1, n / field.target));
    }
    case 'yesno':
      return value?.yes == null ? 0 : value.yes ? 1 : 0;
    default:
      return null;
  }
}

export function hasAnyValue(rec: StepRecord | undefined): boolean {
  if (!rec) return false;
  if (rec.done || rec.notes.length || rec.attachments.length) return true;
  return Object.values(rec.values).some(
    (v) =>
      v.mood != null ||
      (v.text ?? '').trim() !== '' ||
      (v.checks && Object.values(v.checks).some(Boolean)) ||
      v.number != null ||
      v.yes != null,
  );
}

export interface StepSummary {
  moodColor: string | null;
  percents: number[];
  overall: number | null;
  hasText: boolean;
  images: number;
  videos: number;
  files: number;
  active: boolean;
  done: boolean;
}

export function summarize(plan: Plan, period: Period): StepSummary {
  const rec = plan.records[period.key];
  const fields = fieldsFor(plan, period);
  let moodColor: string | null = null;
  const percents: number[] = [];
  let hasText = false;
  for (const f of fields) {
    const v = rec?.values[f.id];
    if (f.type === 'mood' && moodColor == null && v?.mood) {
      moodColor = f.moodOptions?.find((o) => o.id === v.mood)?.color ?? null;
    }
    if (f.type === 'text' && (v?.text ?? '').trim()) hasText = true;
    if (f.type === 'checklist' || f.type === 'number') {
      const c = fieldCompletion(f, v);
      if (c != null) percents.push(Math.round(c * 100));
    }
  }
  if (rec?.notes.length) hasText = true;
  const measurable = fields.map((f) => fieldCompletion(f, rec?.values[f.id])).filter((c): c is number => c != null);
  const overall = measurable.length ? Math.round((measurable.reduce((a, b) => a + b, 0) / measurable.length) * 100) : null;
  const att = rec?.attachments ?? [];
  return {
    moodColor,
    percents,
    overall,
    hasText,
    images: att.filter((a) => a.kind === 'image').length,
    videos: att.filter((a) => a.kind === 'video').length,
    files: att.filter((a) => a.kind === 'file').length,
    active: hasAnyValue(rec),
    done: !!rec?.done || overall === 100,
  };
}

/** Consecutive active steps counting back from the latest. An untouched current step doesn't break it. */
export function streak(plan: Plan, periods: Period[], now: Date = new Date()): { current: number; best: number } {
  let current = 0;
  let counting = true;
  let best = 0;
  let run = 0;
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i];
    const active = hasAnyValue(plan.records[p.key]);
    const ongoing = p.start <= now && (!p.end || p.end > now);
    if (counting) {
      if (active) current++;
      else if (!(ongoing && i === periods.length - 1)) counting = false;
    }
  }
  for (const p of periods) {
    if (hasAnyValue(plan.records[p.key])) {
      run++;
      best = Math.max(best, run);
    } else if (!(p === periods[periods.length - 1] && p.start <= now && (!p.end || p.end > now))) {
      run = 0;
    }
  }
  return { current, best: Math.max(best, current) };
}

export const STREAK_TIERS = [10, 30, 90, 150, 300, 500];

/** 0 below 10, then 1–6 for each milestone reached. */
export function streakTier(n: number): number {
  let tier = 0;
  STREAK_TIERS.forEach((t, i) => {
    if (n >= t) tier = i + 1;
  });
  return tier;
}

export function nextStreakMilestone(n: number): number | null {
  return STREAK_TIERS.find((t) => t > n) ?? null;
}

export function statusReached(s: Status): boolean {
  if (s.kind === 'text' || s.direction === 'match') {
    return s.current.trim().toLowerCase() === s.target.trim().toLowerCase() && s.target.trim() !== '';
  }
  const c = Number(s.current);
  const t = Number(s.target);
  if (!Number.isFinite(c) || !Number.isFinite(t) || s.target.trim() === '') return false;
  return s.direction === 'higher' ? c >= t : c <= t;
}

/** Main statuses first, then by creation. The first three are the always-visible ones. */
export function orderedStatuses(statuses: Status[]): Status[] {
  return [...statuses].sort((a, b) => Number(b.main) - Number(a.main) || a.createdAt.localeCompare(b.createdAt));
}

export const MAX_STATUSES = 7;
export const MAIN_STATUSES = 3;
