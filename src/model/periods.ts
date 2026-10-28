import type { Period, Plan, Trigger, TriggerSegment } from './types';
import { localStamp, parseHHmm } from './util';

const MAX_PERIODS = 20000;
const DAY = 86400000;

function atTime(d: Date, hour: number, minute: number): Date {
  const x = new Date(d);
  x.setHours(hour, minute, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfDay(d: Date): Date {
  return atTime(d, 0, 0);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function calendarDaysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

/** Slot times within a day, as [hour, minute] pairs, sorted. */
export function daySlots(t: Trigger): [number, number][] {
  if (t.type === 'timesPerDay') {
    const slots = (t.times ?? [])
      .map(parseHHmm)
      .filter((x): x is { hour: number; minute: number } => !!x)
      .map((x) => [x.hour, x.minute] as [number, number]);
    slots.sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
    return slots.length ? slots : [[9, 0]];
  }
  if (t.type === 'everyNHours') {
    const every = Math.max(1, t.everyHours ?? 1);
    const from = t.activeFrom ?? 0;
    let to = t.activeTo ?? 24;
    if (to <= from) to = 24;
    const out: [number, number][] = [];
    for (let h = from; h < to && out.length < 48; h += every) {
      const whole = Math.floor(h);
      out.push([whole, Math.round((h - whole) * 60)]);
    }
    return out.length ? out : [[from, 0]];
  }
  return [[t.hour ?? 0, t.minute ?? 0]];
}

/** Smallest trigger boundary strictly after `after`. `anchor` is the segment start (used by everyNDays). */
export function nextBoundary(t: Trigger, after: Date, anchor: Date): Date | null {
  const h = t.hour ?? 0;
  const m = t.minute ?? 0;
  switch (t.type) {
    case 'manual':
      return null;
    case 'daily': {
      const c = atTime(after, h, m);
      return c > after ? c : atTime(addDays(after, 1), h, m);
    }
    case 'weekly':
    case 'weekdays': {
      const days = t.type === 'weekly' ? [t.weekday ?? 1] : t.weekdays?.length ? t.weekdays : [0, 1, 2, 3, 4, 5, 6];
      for (let i = 0; i <= 7; i++) {
        const c = atTime(addDays(after, i), h, m);
        if (c > after && days.includes(c.getDay())) return c;
      }
      return null;
    }
    case 'monthly': {
      const dom = t.dayOfMonth ?? 1;
      for (let i = 0; i <= 13; i++) {
        const base = new Date(after.getFullYear(), after.getMonth() + i, 1);
        const y = base.getFullYear();
        const mo = base.getMonth();
        const c = new Date(y, mo, Math.min(dom, daysInMonth(y, mo)), h, m, 0, 0);
        if (c > after) return c;
      }
      return null;
    }
    case 'yearly': {
      const mo = t.month ?? 0;
      const dom = t.dayOfMonth ?? 1;
      for (let i = 0; i <= 2; i++) {
        const y = after.getFullYear() + i;
        const c = new Date(y, mo, Math.min(dom, daysInMonth(y, mo)), h, m, 0, 0);
        if (c > after) return c;
      }
      return null;
    }
    case 'everyNHours':
    case 'timesPerDay': {
      const slots = daySlots(t);
      for (let i = 0; i <= 2; i++) {
        const day = addDays(startOfDay(after), i);
        for (const [sh, sm] of slots) {
          const c = atTime(day, sh, sm);
          if (c > after) return c;
        }
      }
      return null;
    }
    case 'everyNDays': {
      const n = Math.max(1, t.everyDays ?? 1);
      const first = atTime(anchor, h, m);
      if (first > after) return first;
      let k = Math.floor(calendarDaysBetween(first, after) / n) * n;
      let c = atTime(addDays(first, k), h, m);
      while (c <= after) {
        k += n;
        c = atTime(addDays(first, k), h, m);
      }
      return c;
    }
  }
}

/** Latest boundary at or before `at`, or null if none within one cycle. */
export function boundaryAtOrBefore(t: Trigger, at: Date, anchor: Date): Date | null {
  if (t.type === 'manual') return null;
  if (t.type === 'everyNDays') {
    const n = Math.max(1, t.everyDays ?? 1);
    // Anchor's own boundary may sit later in the day than `at`; step back one cycle so the
    // first step contains the moment the segment started.
    let c = atTime(anchor, t.hour ?? 0, t.minute ?? 0);
    while (c > at) c = addDays(c, -n);
    return c;
  }
  const lookbackDays: Record<string, number> = { daily: 2, weekly: 8, weekdays: 8, monthly: 32, yearly: 367, everyNHours: 3, timesPerDay: 3 };
  let cursor = nextBoundary(t, addDays(at, -(lookbackDays[t.type] ?? 2)), anchor);
  let last: Date | null = null;
  let guard = 0;
  while (cursor && cursor <= at && guard++ < 200) {
    last = cursor;
    cursor = nextBoundary(t, cursor, anchor);
  }
  return last;
}

function endOfDateRule(date: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
}

function segmentPeriods(seg: TriggerSegment, first: boolean, segEnd: Date | null, until: Date): Period[] {
  const t = seg.trigger;
  if (t.type === 'manual') return [];
  const segStart = new Date(seg.startAt);
  // The first segment starts with the step that contains the start moment, so a new plan has a
  // step right away. Later segments start at their first boundary, so the step that was open
  // when the trigger changed keeps its old trigger.
  let start = first
    ? boundaryAtOrBefore(t, segStart, segStart) ?? segStart
    : nextBoundary(t, new Date(segStart.getTime() - 1), segStart);
  const out: Period[] = [];
  while (start && start <= until && (!segEnd || start < segEnd) && out.length < MAX_PERIODS) {
    const next = nextBoundary(t, start, segStart);
    out.push({ key: `${seg.id}@${localStamp(start)}`, index: 0, start, end: next, triggerType: t.type });
    start = next;
  }
  return out;
}

/** All steps of a plan up to `now` (or the finish date), oldest first, with 1-based indexes. */
export function computePeriods(plan: Plan, now: Date = new Date()): Period[] {
  const until = plan.finishedAt && new Date(plan.finishedAt) < now ? new Date(plan.finishedAt) : now;
  const segs = [...plan.segments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  let all: Period[] = [];
  segs.forEach((seg, i) => {
    const segEnd = i + 1 < segs.length ? new Date(segs[i + 1].startAt) : null;
    all.push(...segmentPeriods(seg, i === 0, segEnd, until));
  });
  for (const ms of plan.manualSteps) {
    const at = new Date(ms.at);
    if (at <= until) all.push({ key: `m@${ms.id}`, index: 0, start: at, end: null, triggerType: 'manual' });
  }
  // Records whose step no longer matches a computed period (e.g. after a timezone change) are
  // still shown, at their stored start.
  const keys = new Set(all.map((p) => p.key));
  for (const rec of Object.values(plan.records)) {
    if (!keys.has(rec.key)) {
      all.push({ key: rec.key, index: 0, start: new Date(rec.periodStart), end: null, triggerType: 'manual' });
    }
  }
  all.sort((a, b) => a.start.getTime() - b.start.getTime());

  if (plan.endRule.type === 'date' && plan.endRule.date) {
    const end = endOfDateRule(plan.endRule.date);
    if (end) all = all.filter((p) => p.start <= end);
  }
  if (plan.endRule.type === 'steps' && plan.endRule.steps && plan.endRule.steps > 0) {
    all = all.slice(0, plan.endRule.steps);
  }

  for (let i = 0; i < all.length; i++) {
    const nextStart = all[i + 1]?.start ?? null;
    const p = all[i];
    if (nextStart && (!p.end || p.end > nextStart)) p.end = nextStart;
    p.index = i + 1;
  }
  return all;
}

export function isCurrent(p: Period, now: Date = new Date()): boolean {
  return p.start <= now && (!p.end || p.end > now);
}

export function currentTrigger(plan: Plan): Trigger {
  const segs = [...plan.segments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  return segs[segs.length - 1]?.trigger ?? { type: 'daily' };
}

/** True when the plan's end rule has been reached and only the final "finish" tap remains. */
export function endReached(plan: Plan, periods: Period[], now: Date = new Date()): boolean {
  if (plan.endRule.type === 'steps' && plan.endRule.steps) return periods.length >= plan.endRule.steps;
  if (plan.endRule.type === 'date' && plan.endRule.date) {
    const end = endOfDateRule(plan.endRule.date);
    return !!end && now > end;
  }
  return false;
}
