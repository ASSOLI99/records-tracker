import { Pressable, View } from 'react-native';
import { monthNames, weekdayNames } from '@/i18n';
import type { EndRule, Reminders, Trigger, TriggerType } from '@/model/types';
import { hhmm, parseHHmm } from '@/model/util';
import { ensurePermission } from '@/notifications';
import { useApp } from '@/state/app';
import { Card, Chip, Field, Icon, IconBtn, Row, Section, Segmented, Toggle, Txt } from '@/ui/kit';
import { notify } from '@/ui/overlays';
import { NumberStepper, TimeField } from '@/ui/pickers';
import { alpha, useTheme } from '@/ui/theme';

const BASIC: { type: TriggerType; icon: string }[] = [
  { type: 'daily', icon: 'calendar-today' },
  { type: 'weekly', icon: 'calendar-week' },
  { type: 'monthly', icon: 'calendar-month' },
  { type: 'yearly', icon: 'calendar-star' },
];
const CUSTOM: { type: TriggerType; icon: string }[] = [
  { type: 'everyNHours', icon: 'clock-fast' },
  { type: 'timesPerDay', icon: 'clock-outline' },
  { type: 'weekdays', icon: 'calendar-multiselect' },
  { type: 'everyNDays', icon: 'calendar-refresh' },
  { type: 'manual', icon: 'gesture-tap' },
];
const isCustom = (t: TriggerType) => CUSTOM.some((c) => c.type === t);

export function defaultsFor(type: TriggerType): Trigger {
  switch (type) {
    case 'weekly':
      return { type, weekday: 0, hour: 0, minute: 0 };
    case 'monthly':
      return { type, dayOfMonth: 1, hour: 0, minute: 0 };
    case 'yearly':
      return { type, dayOfMonth: 1, month: 0, hour: 0, minute: 0 };
    case 'everyNHours':
      return { type, everyHours: 2, activeFrom: 8, activeTo: 22 };
    case 'timesPerDay':
      return { type, times: ['08:00', '14:00', '20:00'] };
    case 'weekdays':
      return { type, weekdays: [0, 2, 4], hour: 0, minute: 0 };
    case 'everyNDays':
      return { type, everyDays: 3, hour: 0, minute: 0 };
    default:
      return { type, hour: 0, minute: 0 };
  }
}

function TypeCard({ type, icon, active, onPress, wide }: { type: TriggerType; icon: string; active: boolean; onPress: () => void; wide?: boolean }) {
  const th = useTheme();
  const { t } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: wide ? '100%' : '47%',
        flexGrow: 1,
        padding: 12,
        gap: 4,
        borderRadius: th.radius,
        borderWidth: 2,
        borderColor: active ? th.colors.primary : th.colors.border,
        backgroundColor: active ? alpha(th.colors.primary, 0.14) : th.colors.surface,
      }}
    >
      <Row>
        <Icon name={icon} color={active ? th.colors.primary : th.colors.textDim} />
        <Txt variant="h3" style={{ flex: 1 }}>
          {t(`trigger.${type}` as 'trigger.daily')}
        </Txt>
      </Row>
      <Txt variant="tiny" dim>
        {t(`trigger.${type}.desc` as 'trigger.daily.desc')}
      </Txt>
    </Pressable>
  );
}

export function TriggerPicker({ value, onChange }: { value: Trigger; onChange: (t: Trigger) => void }) {
  const th = useTheme();
  const { t, lang } = useApp();
  const wd = weekdayNames(lang);
  const months = monthNames(lang);
  const set = (patch: Partial<Trigger>) => onChange({ ...value, ...patch });
  const custom = isCustom(value.type);
  const time = <TimeField label={t('trigger.opensAt')} hour={value.hour ?? 0} minute={value.minute ?? 0} onChange={(hour, minute) => set({ hour, minute })} />;

  return (
    <View style={{ gap: 14 }}>
      <Row wrap gap={10}>
        {BASIC.map((b) => (
          <TypeCard key={b.type} type={b.type} icon={b.icon} active={value.type === b.type} onPress={() => onChange(defaultsFor(b.type))} />
        ))}
      </Row>
      <Pressable
        onPress={() => !custom && onChange(defaultsFor('everyNHours'))}
        style={{ padding: 12, borderRadius: th.radius, borderWidth: 2, borderColor: custom ? th.colors.primary : th.colors.border, backgroundColor: custom ? alpha(th.colors.primary, 0.08) : th.colors.surface, gap: 10 }}
      >
        <Row>
          <Icon name="tune-variant" color={custom ? th.colors.primary : th.colors.textDim} />
          <Txt variant="h3">{t('trigger.custom')}</Txt>
        </Row>
        {custom ? (
          <View style={{ gap: 8 }}>
            {CUSTOM.map((c) => (
              <TypeCard key={c.type} type={c.type} icon={c.icon} wide active={value.type === c.type} onPress={() => onChange(defaultsFor(c.type))} />
            ))}
          </View>
        ) : (
          <Txt variant="tiny" dim>
            {[t('trigger.everyNHours'), t('trigger.timesPerDay'), t('trigger.weekdays'), t('trigger.everyNDays'), t('trigger.manual')].join(' · ')}
          </Txt>
        )}
      </Pressable>

      <Card style={{ gap: 14 }}>
        {value.type === 'daily' ? time : null}
        {value.type === 'weekly' ? (
          <>
            <Txt variant="label" dim>{t('trigger.weekday')}</Txt>
            <Row wrap>
              {wd.map((name, i) => (
                <Chip key={i} label={name} active={value.weekday === i} onPress={() => set({ weekday: i })} />
              ))}
            </Row>
            {time}
          </>
        ) : null}
        {value.type === 'monthly' ? (
          <>
            <Txt variant="label" dim>{t('trigger.dayOfMonth')}</Txt>
            <NumberStepper value={value.dayOfMonth ?? 1} min={1} max={31} onChange={(n) => set({ dayOfMonth: n })} />
            {time}
          </>
        ) : null}
        {value.type === 'yearly' ? (
          <>
            <Txt variant="label" dim>{t('trigger.month')}</Txt>
            <Row wrap>
              {months.map((name, i) => (
                <Chip key={i} label={name} active={value.month === i} onPress={() => set({ month: i })} />
              ))}
            </Row>
            <Txt variant="label" dim>{t('trigger.dayOfMonth')}</Txt>
            <NumberStepper value={value.dayOfMonth ?? 1} min={1} max={31} onChange={(n) => set({ dayOfMonth: n })} />
          </>
        ) : null}
        {value.type === 'everyNHours' ? (
          <>
            <Txt variant="label" dim>{t('trigger.every')}</Txt>
            <NumberStepper value={value.everyHours ?? 2} min={1} max={12} onChange={(n) => set({ everyHours: n })} suffix={t('trigger.hours')} />
            <Row gap={16} wrap>
              <TimeField label={t('trigger.from')} hour={value.activeFrom ?? 8} minute={0} onChange={(h) => set({ activeFrom: h })} />
              <TimeField label={t('trigger.to')} hour={(value.activeTo ?? 22) % 24} minute={0} onChange={(h) => set({ activeTo: h === 0 ? 24 : h })} />
            </Row>
          </>
        ) : null}
        {value.type === 'timesPerDay' ? (
          <>
            <Txt variant="label" dim>{t('trigger.times')}</Txt>
            {(value.times ?? []).map((s, i) => {
              const p = parseHHmm(s) ?? { hour: 9, minute: 0 };
              return (
                <Row key={i} gap={8}>
                  <TimeField
                    hour={p.hour}
                    minute={p.minute}
                    onChange={(h, m) => set({ times: (value.times ?? []).map((x, j) => (j === i ? hhmm(h, m) : x)) })}
                  />
                  {(value.times ?? []).length > 1 ? (
                    <IconBtn name="trash-can-outline" color={th.colors.danger} onPress={() => set({ times: (value.times ?? []).filter((_, j) => j !== i) })} />
                  ) : null}
                </Row>
              );
            })}
            {(value.times ?? []).length < 12 ? <Chip icon="plus" label={t('trigger.addTime')} onPress={() => set({ times: [...(value.times ?? []), '12:00'] })} /> : null}
          </>
        ) : null}
        {value.type === 'weekdays' ? (
          <>
            <Txt variant="label" dim>{t('trigger.weekday')}</Txt>
            <Row wrap>
              {wd.map((name, i) => {
                const on = (value.weekdays ?? []).includes(i);
                return (
                  <Chip
                    key={i}
                    label={name}
                    active={on}
                    onPress={() => {
                      const next = on ? (value.weekdays ?? []).filter((d) => d !== i) : [...(value.weekdays ?? []), i].sort();
                      if (next.length) set({ weekdays: next });
                    }}
                  />
                );
              })}
            </Row>
            {time}
          </>
        ) : null}
        {value.type === 'everyNDays' ? (
          <>
            <Txt variant="label" dim>{t('trigger.every')}</Txt>
            <NumberStepper value={value.everyDays ?? 3} min={2} max={60} onChange={(n) => set({ everyDays: n })} suffix={t('trigger.days')} />
            {time}
          </>
        ) : null}
        {value.type === 'manual' ? <Txt dim>{t('trigger.manual.desc')}</Txt> : null}
      </Card>
    </View>
  );
}

export function EndRuleEditor({ value, onChange }: { value: EndRule; onChange: (e: EndRule) => void }) {
  const { t } = useApp();
  return (
    <Section title={t('trigger.end')}>
      <Segmented
        value={value.type}
        onChange={(type) => onChange({ ...value, type, steps: value.steps ?? 30, date: value.date ?? '' })}
        options={[
          { value: 'none', label: t('trigger.end.none') },
          { value: 'steps', label: t('trigger.end.steps') },
          { value: 'date', label: t('trigger.end.date') },
        ]}
      />
      {value.type === 'steps' ? (
        <NumberStepper value={value.steps ?? 30} min={1} max={5000} step={value.steps && value.steps >= 30 ? 5 : 1} onChange={(n) => onChange({ ...value, steps: n })} />
      ) : null}
      {value.type === 'date' ? (
        <Field
          label={t('trigger.end.dateValue')}
          value={value.date ?? ''}
          onChangeText={(date) => onChange({ ...value, date })}
          placeholder="2027-01-01"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      ) : null}
    </Section>
  );
}

export function RemindersEditor({ value, onChange, manual }: { value: Reminders; onChange: (r: Reminders) => void; manual?: boolean }) {
  const { t } = useApp();
  const nudge = value.nudge ? parseHHmm(value.nudge) : null;
  const withPermission = async (next: Reminders) => {
    if ((next.onOpen || next.nudge) && !(await ensurePermission())) {
      notify(t('settings.notifications'), t('notif.permission'));
      return;
    }
    onChange(next);
  };
  return (
    <Section title={t('trigger.reminders')}>
      {!manual ? <Toggle value={value.onOpen} onChange={(onOpen) => withPermission({ ...value, onOpen })} label={t('trigger.reminders.onOpen')} /> : null}
      <Toggle value={!!value.nudge} onChange={(on) => withPermission({ ...value, nudge: on ? '20:00' : null })} label={t('trigger.reminders.nudge')} />
      {nudge ? <TimeField hour={nudge.hour} minute={nudge.minute} onChange={(h, m) => onChange({ ...value, nudge: hhmm(h, m) })} /> : null}
    </Section>
  );
}
