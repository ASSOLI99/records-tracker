import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { FIELD_ICONS } from '@/components/TemplateEditor';
import { ThemePicker } from '@/components/ThemePicker';
import { EndRuleEditor, RemindersEditor, TriggerPicker, defaultsFor } from '@/components/TriggerEditor';
import { PRESETS, presetFields, type PresetId } from '@/model/presets';
import type { EndRule, Plan, Reminders, Trigger } from '@/model/types';
import { nowIso, uid } from '@/model/util';
import { useApp } from '@/state/app';
import { getTheme } from '@/themes/themes';
import { Btn, Card, Field, Icon, ProgressBar, Row, Txt } from '@/ui/kit';
import { Header, Screen, notify } from '@/ui/overlays';
import { IconPicker } from '@/ui/pickers';
import { ThemeProvider, alpha, useTheme } from '@/ui/theme';

const STEPS = 4;

function PresetCard({ id, icon, active, onPress }: { id: PresetId; icon: string; active: boolean; onPress: () => void }) {
  const th = useTheme();
  const { t } = useApp();
  const fields = useMemo(() => presetFields(id, t), [id, t]);
  return (
    <Pressable
      onPress={onPress}
      style={{ padding: 14, gap: 8, borderRadius: th.radius, borderWidth: 2, borderColor: active ? th.colors.primary : th.colors.border, backgroundColor: active ? alpha(th.colors.primary, 0.12) : th.colors.surface }}
    >
      <Row>
        <Icon name={icon} color={active ? th.colors.primary : th.colors.textDim} />
        <Txt variant="h3" style={{ flex: 1 }}>
          {t(`template.preset.${id}` as 'template.preset.blank')}
        </Txt>
        {active ? <Icon name="check-circle" color={th.colors.primary} /> : null}
      </Row>
      {fields.map((f) => (
        <Row key={f.id} gap={6}>
          <Icon name={FIELD_ICONS[f.type]} size={16} color={th.colors.textDim} />
          <Txt variant="small" dim style={{ flex: 1 }}>
            {f.label}
            {f.items?.length ? ` — ${f.items.map((i) => i.label).join(', ')}` : ''}
          </Txt>
        </Row>
      ))}
    </Pressable>
  );
}

export default function NewPlan() {
  const { t, addPlan } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const [themeId, setThemeId] = useState('arcade');
  const [trigger, setTrigger] = useState<Trigger>(defaultsFor('daily'));
  const [endRule, setEndRule] = useState<EndRule>({ type: 'none' });
  const [reminders, setReminders] = useState<Reminders>({ onOpen: false, nudge: null });
  const [preset, setPreset] = useState<PresetId>('checkin');
  const [busy, setBusy] = useState(false);
  const theme = getTheme(themeId);

  const next = () => {
    if (step === 1 && !name.trim()) return notify(t('plan.new.nameRequired'));
    setStep((s) => Math.min(STEPS, s + 1));
  };
  const back = () => (step === 1 ? router.back() : setStep((s) => s - 1));

  const create = async () => {
    setBusy(true);
    try {
      const now = nowIso();
      const plan: Omit<Plan, 'folder'> = {
        version: 1,
        id: uid(),
        name: name.trim(),
        themeId,
        view: theme.defaultView,
        icon,
        createdAt: now,
        updatedAt: now,
        finishedAt: null,
        segments: [{ id: uid(), startAt: now, trigger }],
        endRule: endRule.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(endRule.date ?? '') ? { type: 'none' } : endRule,
        reminders: trigger.type === 'manual' ? { ...reminders, onOpen: false } : reminders,
        templates: [{ id: uid(), effectiveFrom: now, fields: presetFields(preset, t) }],
        records: {},
        manualSteps: trigger.type === 'manual' ? [{ id: uid(), at: now }] : [],
        events: [],
        statuses: [],
        goals: [],
      };
      const created = await addPlan(plan);
      router.replace(`/plan/${created.id}`);
    } catch (e) {
      notify(t('common.error'), String((e as Error)?.message ?? e));
      setBusy(false);
    }
  };

  return (
    <ThemeProvider theme={step >= 2 ? theme : getTheme('minimal')}>
      <Screen>
        <Header title={t('plan.new.title')} subtitle={t('plan.new.step', { n: step, total: STEPS })} onBack={back} />
        <ProgressBar value={step / STEPS} />

        {step === 1 ? (
          <View style={{ gap: 16 }}>
            <Field label={t('plan.new.name')} value={name} onChangeText={setName} placeholder={t('plan.new.namePlaceholder')} autoFocus maxLength={60} returnKeyType="next" onSubmitEditing={next} />
            <Card onPress={() => setIconOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name={icon ?? 'shape-outline'} size={28} />
              <Txt style={{ flex: 1 }}>
                {t('status.icon')} <Txt variant="small" dim>({t('common.optional')})</Txt>
              </Txt>
              <Icon name="chevron-down" />
            </Card>
            <IconPicker
              visible={iconOpen}
              value={icon}
              onClose={() => setIconOpen(false)}
              onPick={(n) => {
                setIcon(n);
                setIconOpen(false);
              }}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 12 }}>
            <Txt variant="h3">{t('plan.new.theme')}</Txt>
            <ThemePicker value={themeId} onChange={setThemeId} />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: 18 }}>
            <Txt variant="h3">{t('plan.new.trigger')}</Txt>
            <TriggerPicker value={trigger} onChange={setTrigger} />
            <EndRuleEditor value={endRule} onChange={setEndRule} />
            <RemindersEditor value={reminders} onChange={setReminders} manual={trigger.type === 'manual'} />
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: 12 }}>
            <Txt variant="h3">{t('plan.new.template')}</Txt>
            <Txt variant="small" dim>
              {t('plan.new.templateHint')}
            </Txt>
            {PRESETS.map((p) => (
              <PresetCard key={p.id} id={p.id} icon={p.icon} active={preset === p.id} onPress={() => setPreset(p.id)} />
            ))}
          </View>
        ) : null}

        {step < STEPS ? <Btn label={t('common.next')} onPress={next} /> : <Btn label={t('plan.new.create')} icon="rocket-launch-outline" onPress={create} disabled={busy} />}
      </Screen>
    </ThemeProvider>
  );
}
