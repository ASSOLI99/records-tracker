// Keeps the Android home-screen widget in step with the app's plans.
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import type { TFn } from '@/i18n';
import { dateTime } from '@/model/labels';
import type { Lang, Plan } from '@/model/types';
import { widgetPlans } from '@/model/widget';
import { getTheme } from '@/themes/themes';
import type { TodayWidgetProps } from './TodayWidget';

type WidgetHandle = { updateSnapshot: (p: TodayWidgetProps) => void };

let widget: WidgetHandle | null | undefined;
function getWidget(): WidgetHandle | null {
  if (widget !== undefined) return widget;
  widget = null;
  // Widgets are only configured for Android; the module isn't touched elsewhere.
  if (Platform.OS !== 'android') return widget;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    widget = (require('./TodayWidget') as typeof import('./TodayWidget')).TodayWidget;
  } catch {
    widget = null;
  }
  return widget;
}

export function widgetProps(plans: Plan[], t: TFn, lang: Lang, now: Date = new Date()): TodayWidgetProps {
  return {
    title: t('widget.title'),
    empty: t('widget.empty'),
    updated: t('widget.updated', { time: dateTime(now, lang) }),
    plans: widgetPlans(plans, t, (id) => getTheme(id).colors.primary, now),
  };
}

export function syncWidget(plans: Plan[], t: TFn, lang: Lang) {
  const w = getWidget();
  if (!w) return;
  try {
    w.updateSnapshot(widgetProps(plans, t, lang));
  } catch {
    // A widget that can't update must never break the app.
  }
}

/** Pushes fresh data shortly after plans change, and whenever the app goes to the background. */
export function useWidgetSync(ready: boolean, plans: Plan[], t: TFn, lang: Lang) {
  const latest = useRef({ plans, t, lang });
  useEffect(() => {
    latest.current = { plans, t, lang };
  });
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => syncWidget(plans, t, lang), 600);
    return () => clearTimeout(id);
  }, [ready, plans, t, lang]);
  useEffect(() => {
    if (!ready) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') syncWidget(latest.current.plans, latest.current.t, latest.current.lang);
    });
    return () => sub.remove();
  }, [ready]);
}
