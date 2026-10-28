import type { JourneyEvent, Period, Plan } from './types';
import { isCurrent } from './periods';
import { summarize, type StepSummary } from './progress';

export type JourneyItem =
  | { type: 'finish'; key: 'finish' }
  | { type: 'step'; key: string; period: Period; summary: StepSummary; current: boolean }
  | { type: 'event'; key: string; event: JourneyEvent }
  | { type: 'start'; key: 'start'; at: string };

/** Journey items newest first: finish line, steps and events interleaved by time, start. */
export function buildJourney(plan: Plan, periods: Period[], now: Date = new Date()): JourneyItem[] {
  const chrono: JourneyItem[] = [];
  const events = [...plan.events].sort((a, b) => a.at.localeCompare(b.at));
  let e = 0;
  for (const p of periods) {
    while (e < events.length && new Date(events[e].at) < p.start) {
      chrono.push({ type: 'event', key: `e:${events[e].id}`, event: events[e] });
      e++;
    }
    chrono.push({ type: 'step', key: p.key, period: p, summary: summarize(plan, p), current: isCurrent(p, now) && !plan.finishedAt });
  }
  for (; e < events.length; e++) chrono.push({ type: 'event', key: `e:${events[e].id}`, event: events[e] });
  const firstStart = plan.segments.map((s) => s.startAt).sort()[0] ?? plan.createdAt;
  return [{ type: 'finish', key: 'finish' }, ...chrono.reverse(), { type: 'start', key: 'start', at: firstStart }];
}
