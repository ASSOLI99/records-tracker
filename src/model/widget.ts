// What the home-screen widget shows, computed from the plans. Pure, so it can be unit-tested;
// src/widgets/sync.ts pushes the result to the widget.
import type { TFn } from '@/i18n';
import { isCurrent, computePeriods } from './periods';
import { streak, summarize } from './progress';
import type { Plan } from './types';

export interface WidgetPlan {
  name: string;
  streak: string;
  label: string;
  progress: number;
  color: string;
  done: boolean;
}

/**
 * Active plans, the ones with an open step first, then by last activity. Each shows its streak,
 * and the state of the open step: done, a percentage, or still to do.
 */
export function widgetPlans(plans: Plan[], t: TFn, colorOf: (themeId: string) => string, now: Date = new Date()): WidgetPlan[] {
  const rows = plans
    .filter((p) => !p.finishedAt)
    .map((plan) => {
      const periods = computePeriods(plan, now);
      const last = periods[periods.length - 1];
      const open = last && isCurrent(last, now) ? last : null;
      const s = open ? summarize(plan, open) : null;
      const current = streak(plan, periods, now).current;
      let label: string;
      let progress = 0;
      let done = false;
      if (!s) label = t('widget.noStep');
      else if (s.done) {
        label = t('widget.done');
        progress = 1;
        done = true;
      } else if (s.overall != null && s.overall > 0) {
        label = t('widget.percent', { n: s.overall });
        progress = s.overall / 100;
      } else if (s.active) {
        label = t('widget.started');
        progress = 0.1;
      } else label = t('widget.todo');
      return {
        open: !!open,
        updatedAt: plan.updatedAt,
        row: { name: plan.name, streak: `🔥 ${current}`, label, progress, color: colorOf(plan.themeId), done },
      };
    });
  rows.sort((a, b) => Number(b.open) - Number(a.open) || b.updatedAt.localeCompare(a.updatedAt));
  return rows.map((r) => r.row);
}
