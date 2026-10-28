// Local notifications only — nothing leaves the device. Each plan's reminders are rebuilt from
// its current trigger whenever the trigger, reminders or finish state change, and every plan is
// rescheduled on app start (one-off "every N days" reminders need topping up).
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import type { TFn } from '@/i18n';
import type { Plan } from '@/model/types';
import { currentTrigger, daySlots, nextBoundary } from '@/model/periods';
import { parseHHmm } from '@/model/util';

const CHANNEL = 'reminders';
const { SchedulableTriggerInputTypes: T } = Notifications;
/** iOS keeps at most 64 pending notifications per app; leave headroom across plans. */
const PER_PLAN_LIMIT = 20;

let configured = false;
async function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }
}

export async function ensurePermission(): Promise<boolean> {
  await configure();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelPlanReminders(planId: string) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter((n) => n.content.data?.planId === planId).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

type Input = Notifications.NotificationTriggerInput;

function stepTriggers(plan: Plan): Input[] {
  const tr = currentTrigger(plan);
  const h = tr.hour ?? 0;
  const m = tr.minute ?? 0;
  const channelId = CHANNEL;
  switch (tr.type) {
    case 'daily':
      return [{ type: T.DAILY, hour: h, minute: m, channelId }];
    case 'weekly':
      // Notifications weekdays are 1 = Sunday … 7 = Saturday.
      return [{ type: T.WEEKLY, weekday: (tr.weekday ?? 1) + 1, hour: h, minute: m, channelId }];
    case 'weekdays':
      return (tr.weekdays ?? []).map((d) => ({ type: T.WEEKLY, weekday: d + 1, hour: h, minute: m, channelId }) as Input);
    case 'monthly':
      return [{ type: T.MONTHLY, day: Math.min(tr.dayOfMonth ?? 1, 28), hour: h, minute: m, channelId }];
    case 'yearly':
      return [{ type: T.YEARLY, month: tr.month ?? 0, day: tr.dayOfMonth ?? 1, hour: h, minute: m, channelId }];
    case 'timesPerDay':
    case 'everyNHours':
      return daySlots(tr).map(([sh, sm]) => ({ type: T.DAILY, hour: sh, minute: sm, channelId }) as Input);
    case 'everyNDays': {
      const seg = [...plan.segments].sort((a, b) => a.startAt.localeCompare(b.startAt)).pop();
      const anchor = new Date(seg?.startAt ?? plan.createdAt);
      const out: Input[] = [];
      let cursor = new Date();
      for (let i = 0; i < 10; i++) {
        const next = nextBoundary(tr, cursor, anchor);
        if (!next) break;
        out.push({ type: T.DATE, date: next, channelId });
        cursor = next;
      }
      return out;
    }
    case 'manual':
      return [];
  }
}

export async function schedulePlanReminders(plan: Plan, t: TFn) {
  await cancelPlanReminders(plan.id);
  const wantsAny = plan.reminders.onOpen || !!plan.reminders.nudge;
  if (plan.finishedAt || !wantsAny) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  await configure();
  const data = { planId: plan.id };
  const jobs: Promise<string>[] = [];
  if (plan.reminders.onOpen) {
    for (const trigger of stepTriggers(plan).slice(0, PER_PLAN_LIMIT - 1)) {
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content: { title: t('notif.newStep.title', { plan: plan.name }), body: t('notif.newStep.body'), data },
          trigger,
        }),
      );
    }
  }
  const nudge = plan.reminders.nudge ? parseHHmm(plan.reminders.nudge) : null;
  if (nudge) {
    jobs.push(
      Notifications.scheduleNotificationAsync({
        content: { title: t('notif.nudge.title', { plan: plan.name }), body: t('notif.nudge.body'), data },
        trigger: { type: T.DAILY, hour: nudge.hour, minute: nudge.minute, channelId: CHANNEL },
      }),
    );
  }
  await Promise.all(jobs);
}

export async function rescheduleAll(plans: Plan[], t: TFn) {
  for (const p of plans) await schedulePlanReminders(p, t);
}
