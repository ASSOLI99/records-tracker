import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePeriods, nextBoundary, boundaryAtOrBefore, endReached } from '../periods';
import { streak, streakTier, summarize, statusReached, fieldsFor } from '../progress';
import { buildJourney } from '../journey';
import type { Plan, Trigger } from '../types';

function plan(trigger: Trigger, startAt: Date, extra: Partial<Plan> = {}): Plan {
  return {
    version: 1,
    id: 'p',
    name: 'Test',
    folder: 'Test',
    themeId: 'minimal',
    view: 'map',
    createdAt: startAt.toISOString(),
    updatedAt: startAt.toISOString(),
    segments: [{ id: 's1', startAt: startAt.toISOString(), trigger }],
    endRule: { type: 'none' },
    reminders: { onOpen: false },
    templates: [{ id: 't1', effectiveFrom: startAt.toISOString(), fields: [] }],
    records: {},
    manualSteps: [],
    events: [],
    statuses: [],
    goals: [],
    ...extra,
  };
}

const d = (y: number, mo: number, day: number, h = 0, mi = 0) => new Date(y, mo - 1, day, h, mi);

test('daily: first step contains the start moment, one step per day', () => {
  const p = plan({ type: 'daily' }, d(2026, 10, 1, 14));
  const periods = computePeriods(p, d(2026, 10, 5, 9));
  assert.equal(periods.length, 5);
  assert.deepEqual(periods[0].start, d(2026, 10, 1));
  assert.deepEqual(periods[0].end, d(2026, 10, 2));
  assert.equal(periods[4].index, 5);
  assert.equal(periods[4].end?.getTime(), d(2026, 10, 6).getTime());
});

test('weekly on Monday', () => {
  const t: Trigger = { type: 'weekly', weekday: 1 };
  // 2026-10-28 is a Wednesday
  assert.equal(nextBoundary(t, d(2026, 10, 28), d(2026, 10, 28)).getTime(), d(2026, 11, 2).getTime());
  assert.equal(boundaryAtOrBefore(t, d(2026, 10, 28), d(2026, 10, 28))?.getTime(), d(2026, 10, 26).getTime());
});

test('monthly on the 31st clamps to short months', () => {
  const t: Trigger = { type: 'monthly', dayOfMonth: 31 };
  assert.equal(nextBoundary(t, d(2026, 2, 1), d(2026, 2, 1))!.getTime(), d(2026, 2, 28).getTime());
});

test('every 2 hours between 08:00 and 22:00', () => {
  const p = plan({ type: 'everyNHours', everyHours: 2, activeFrom: 8, activeTo: 22 }, d(2026, 10, 28, 9, 30));
  const periods = computePeriods(p, d(2026, 10, 28, 23));
  assert.deepEqual(
    periods.map((x) => x.start.getHours()),
    [8, 10, 12, 14, 16, 18, 20],
  );
  assert.equal(periods[6].end?.getTime(), d(2026, 10, 29, 8).getTime());
});

test('specific weekdays', () => {
  const p = plan({ type: 'weekdays', weekdays: [1, 3, 5] }, d(2026, 10, 26, 7));
  const periods = computePeriods(p, d(2026, 11, 1, 12));
  assert.deepEqual(periods.map((x) => x.start.getDate()), [26, 28, 30]);
});

test('every 3 days', () => {
  const p = plan({ type: 'everyNDays', everyDays: 3, hour: 6 }, d(2026, 10, 1, 9));
  const periods = computePeriods(p, d(2026, 10, 10, 12));
  assert.deepEqual(periods.map((x) => x.start.getDate()), [1, 4, 7, 10]);
});

test('changing the trigger keeps the open step on the old trigger', () => {
  const p = plan({ type: 'weekly', weekday: 1 }, d(2026, 10, 5, 10));
  p.segments.push({ id: 's2', startAt: d(2026, 10, 14, 15).toISOString(), trigger: { type: 'daily' } });
  const periods = computePeriods(p, d(2026, 10, 16, 12));
  assert.deepEqual(
    periods.map((x) => [x.key.split('@')[0], x.start.getDate()]),
    [['s1', 5], ['s1', 12], ['s2', 15], ['s2', 16]],
  );
  // The weekly step that was open is closed by the first daily step.
  assert.equal(periods[1].end?.getTime(), d(2026, 10, 15).getTime());
});

test('end rule: N steps', () => {
  const p = plan({ type: 'daily' }, d(2026, 10, 1), { endRule: { type: 'steps', steps: 3 } });
  const periods = computePeriods(p, d(2026, 10, 9));
  assert.equal(periods.length, 3);
  assert.equal(endReached(p, periods, d(2026, 10, 9)), true);
});

test('manual steps', () => {
  const p = plan({ type: 'manual' }, d(2026, 10, 1), {
    manualSteps: [
      { id: 'a', at: d(2026, 10, 2).toISOString() },
      { id: 'b', at: d(2026, 10, 3).toISOString() },
    ],
  });
  const periods = computePeriods(p, d(2026, 10, 9));
  assert.equal(periods.length, 2);
  assert.equal(periods[0].end?.getTime(), d(2026, 10, 3).getTime());
});

test('streak counts back from latest; untouched current step does not break it', () => {
  const p = plan({ type: 'daily' }, d(2026, 10, 1));
  const now = d(2026, 10, 12, 10);
  const periods = computePeriods(p, now);
  const rec = (key: string) => ({ key, periodStart: '', fields: [], values: {}, notes: [], attachments: [], done: true, createdAt: '', updatedAt: '' });
  // Active days 1–3, gap on day 4, active 5–11, today (12) untouched.
  for (const per of periods) {
    const day = per.start.getDate();
    if (day !== 4 && day !== 12) p.records[per.key] = rec(per.key);
  }
  const s = streak(p, periods, now);
  assert.equal(s.current, 7);
  assert.equal(s.best, 7);
});

test('streak tiers', () => {
  assert.equal(streakTier(9), 0);
  assert.equal(streakTier(10), 1);
  assert.equal(streakTier(150), 4);
  assert.equal(streakTier(999), 6);
});

test('summary: mood colour, percents, attachments', () => {
  const start = d(2026, 10, 1);
  const p = plan({ type: 'daily' }, start);
  p.templates[0].fields = [
    { id: 'm', type: 'mood', label: 'Mood', moodOptions: [{ id: 'g', label: 'Good', color: '#0f0' }] },
    { id: 'c', type: 'checklist', label: 'Todo', items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
    { id: 'n', type: 'number', label: 'Water', target: 8 },
  ];
  const periods = computePeriods(p, d(2026, 10, 1, 12));
  const key = periods[0].key;
  p.records[key] = {
    key,
    periodStart: start.toISOString(),
    fields: fieldsFor(p, periods[0]),
    values: { m: { mood: 'g' }, c: { checks: { a: true } }, n: { number: 6 } },
    notes: [],
    attachments: [{ id: 'x', kind: 'image', file: 'x.jpg', originalName: 'x.jpg', createdAt: '' }],
    createdAt: '',
    updatedAt: '',
  };
  const s = summarize(p, periods[0]);
  assert.equal(s.moodColor, '#0f0');
  assert.deepEqual(s.percents, [50, 75]);
  assert.equal(s.images, 1);
  assert.equal(s.active, true);
});

test('template edits apply to unfilled steps that have not ended, not to past ones', () => {
  const p = plan({ type: 'daily' }, d(2026, 10, 1));
  p.templates.push({ id: 't2', effectiveFrom: d(2026, 10, 3, 12).toISOString(), fields: [{ id: 'x', type: 'text', label: 'New' }] });
  const periods = computePeriods(p, d(2026, 10, 3, 13));
  assert.equal(fieldsFor(p, periods[0], d(2026, 10, 3, 13)).length, 0);
  assert.equal(fieldsFor(p, periods[2], d(2026, 10, 3, 13)).length, 1);
});

test('status reached', () => {
  const base = { id: '1', name: 'w', main: true, history: [], createdAt: '', updatedAt: '' };
  assert.equal(statusReached({ ...base, kind: 'number', current: '70', target: '72', direction: 'lower' }), true);
  assert.equal(statusReached({ ...base, kind: 'number', current: '70', target: '72', direction: 'higher' }), false);
  assert.equal(statusReached({ ...base, kind: 'text', current: 'Blue Belt', target: 'blue belt', direction: 'match' }), true);
});

test('journey interleaves events between steps, newest first', () => {
  const p = plan({ type: 'daily' }, d(2026, 10, 1));
  p.events.push({ id: 'e', at: d(2026, 10, 2, 15).toISOString(), kind: 'status', title: 'Weight', from: '80', to: '79' });
  const periods = computePeriods(p, d(2026, 10, 3, 10));
  const items = buildJourney(p, periods, d(2026, 10, 3, 10));
  assert.deepEqual(
    items.map((i) => i.type),
    ['finish', 'step', 'event', 'step', 'step', 'start'],
  );
  assert.equal(items[1].type === 'step' && items[1].current, true);
});
