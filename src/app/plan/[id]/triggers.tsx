import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { EndRuleEditor, RemindersEditor, TriggerPicker } from '@/components/TriggerEditor';
import { currentTrigger } from '@/model/periods';
import { shortDate, triggerSummary } from '@/model/labels';
import type { EndRule, Reminders, Trigger } from '@/model/types';
import { nowIso, uid } from '@/model/util';
import { useApp, usePlan } from '@/state/app';
import { getTheme } from '@/themes/themes';
import { Btn, Card, Icon, Row, Section, Txt } from '@/ui/kit';
import { Header, Screen, confirm, notify } from '@/ui/overlays';
import { ThemeProvider } from '@/ui/theme';

export default function TriggersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id);
  const { t, lang, updatePlan } = useApp();
  const [trigger, setTrigger] = useState<Trigger | null>(() => (plan ? currentTrigger(plan) : null));
  const [endRule, setEndRule] = useState<EndRule | null>(() => plan?.endRule ?? null);
  const [reminders, setReminders] = useState<Reminders | null>(() => plan?.reminders ?? null);
  if (!plan || !trigger || !endRule || !reminders) return null;
  const theme = getTheme(plan.themeId);
  const triggerChanged = JSON.stringify(trigger) !== JSON.stringify(currentTrigger(plan));
  const dirty = triggerChanged || JSON.stringify(endRule) !== JSON.stringify(plan.endRule) || JSON.stringify(reminders) !== JSON.stringify(plan.reminders);

  const save = async () => {
    if (endRule.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(endRule.date ?? '')) return notify(t('trigger.end.dateValue'));
    if (!(await confirm(t, triggerChanged ? t('trigger.edit.confirm') : t('common.saveChanges')))) return;
    const now = nowIso();
    await updatePlan(plan.id, (p) => ({
      ...p,
      endRule,
      reminders: trigger.type === 'manual' ? { ...reminders, onOpen: false } : reminders,
      segments: triggerChanged ? [...p.segments, { id: uid(), startAt: now, trigger }] : p.segments,
      events: triggerChanged ? [...p.events, { id: uid(), at: now, kind: 'trigger', title: triggerSummary(trigger, lang, t) }] : p.events,
    }));
    router.back();
  };

  const history = [...plan.segments].sort((a, b) => b.startAt.localeCompare(a.startAt));

  return (
    <ThemeProvider theme={theme}>
      <Screen>
        <Header title={t('trigger.edit.title')} subtitle={plan.name} onBack={() => router.back()} />
        <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="information-outline" color={theme.colors.accent} />
          <Txt variant="small" style={{ flex: 1 }}>
            {t('trigger.edit.note')}
          </Txt>
        </Card>
        <TriggerPicker value={trigger} onChange={setTrigger} />
        <EndRuleEditor value={endRule} onChange={setEndRule} />
        <RemindersEditor value={reminders} onChange={setReminders} manual={trigger.type === 'manual'} />
        <Section title={t('status.history')}>
          <View style={{ gap: 6 }}>
            {history.map((s) => (
              <Row key={s.id} style={{ justifyContent: 'space-between' }}>
                <Txt variant="small" style={{ flex: 1 }}>
                  {triggerSummary(s.trigger, lang, t)}
                </Txt>
                <Txt variant="tiny" dim>
                  {shortDate(new Date(s.startAt), lang)}
                </Txt>
              </Row>
            ))}
          </View>
        </Section>
        <Btn label={t('common.save')} icon="check" disabled={!dirty} onPress={save} />
      </Screen>
    </ThemeProvider>
  );
}
