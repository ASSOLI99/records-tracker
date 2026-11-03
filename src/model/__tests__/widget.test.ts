import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { transformSync } from '@babel/core';
import { widgetPlans } from '../widget';
import { computePeriods } from '../periods';
import type { Plan, TemplateField } from '../types';

const t = ((key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key)) as never;
const fields: TemplateField[] = [{ id: 'c', type: 'checklist', label: 'todo', items: [{ id: 'a', label: 'a' }, { id: 'b', label: 'b' }] }];

function plan(id: string, startAt: Date, extra: Partial<Plan> = {}): Plan {
  return {
    version: 1, id, name: id, folder: id, themeId: 'minimal', view: 'map',
    createdAt: startAt.toISOString(), updatedAt: startAt.toISOString(),
    segments: [{ id: 's', startAt: startAt.toISOString(), trigger: { type: 'daily', hour: 6, minute: 0 } }],
    endRule: { type: 'none' }, reminders: { onOpen: false },
    templates: [{ id: 't', effectiveFrom: startAt.toISOString(), fields }],
    records: {}, manualSteps: [], events: [], statuses: [], goals: [], ...extra,
  };
}

function fill(p: Plan, now: Date, checks: Record<string, boolean>, back = 0): Plan {
  const periods = computePeriods(p, now);
  const per = periods[periods.length - 1 - back];
  p.records[per.key] = { key: per.key, periodStart: per.start.toISOString(), fields, values: { c: { checks } }, notes: [], attachments: [], createdAt: '', updatedAt: '' };
  return p;
}

test('widget rows: open steps first, with streak and step state; finished plans hidden', () => {
  const now = new Date(2026, 10, 3, 12, 0);
  const start = new Date(2026, 10, 1, 6, 0);
  const done = fill(fill(plan('done', start, { updatedAt: '2026-11-03T08:00:00.000Z' }), now, { a: true, b: true }), now, { a: true }, 1);
  const half = fill(plan('half', start, { updatedAt: '2026-11-03T09:00:00.000Z' }), now, { a: true });
  const todo = plan('todo', start);
  const finished = plan('finished', start, { finishedAt: '2026-11-02T00:00:00.000Z' });
  const manual = plan('manual', start, { segments: [{ id: 's', startAt: start.toISOString(), trigger: { type: 'manual' } }], updatedAt: '2026-11-03T11:00:00.000Z' });
  const rows = widgetPlans([manual, todo, done, half, finished], t, () => '#123456', now);
  assert.deepEqual(rows.map((r) => r.name), ['half', 'done', 'todo', 'manual']);
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  assert.equal(byName.done.done, true);
  assert.equal(byName.done.streak, '🔥 2');
  assert.equal(byName.half.label, 'widget.percent:{"n":50}');
  assert.equal(byName.half.progress, 0.5);
  assert.equal(byName.todo.label, 'widget.todo');
  assert.equal(byName.manual.label, 'widget.noStep');
  assert.equal(byName.todo.color, '#123456');
});

test('the widget layout compiles to a self-contained function that renders', () => {
  const src = readFileSync(join(__dirname, '../../widgets/TodayWidget.tsx'), 'utf8');
  const out = transformSync(src, {
    filename: 'TodayWidget.tsx',
    babelrc: false,
    configFile: false,
    presets: [require.resolve('babel-preset-expo', { paths: [dirname(require.resolve('expo/package.json'))] })],
    caller: { name: 'metro', platform: 'android', bundler: 'metro', isDev: false } as never,
  })!.code!;
  const layoutSrc = /var TodayLayout\s*=\s*`([^`]*)`/.exec(out)?.[1];
  assert.ok(layoutSrc, 'the widget directive turned the layout into a string');
  // Evaluate it the way the widget runtime does: only jsx helpers, components and modifiers in scope.
  const el = (type: string) => (props: object) => ({ type, props });
  const scope: Record<string, unknown> = {
    _jsx: (type: unknown, props: object) => ({ type, props }),
    _jsxs: (type: unknown, props: object) => ({ type, props }),
    Column: 'Column', Row: 'Row', Text: 'Text', Spacer: 'Spacer', LinearProgressIndicator: 'LinearProgressIndicator',
    fillMaxSize: el('fillMaxSize'), fillMaxWidth: el('fillMaxWidth'), cornerRadius: el('cornerRadius'), background: el('background'),
    paddingAll: el('paddingAll'), padding: el('padding'), height: el('height'),
  };
  const layout = new Function(...Object.keys(scope), `return (${layoutSrc});`)(...Object.values(scope));
  const tree = layout(
    { title: 'T', empty: 'E', updated: 'U', plans: [{ name: 'Gym', streak: '🔥 3', label: '50%', progress: 0.5, color: '#f00', done: false }] },
    { colorScheme: 'dark' },
  );
  const json = JSON.stringify(tree);
  assert.match(json, /🔥 3  Gym/);
  assert.match(json, /#16182c/);
});
