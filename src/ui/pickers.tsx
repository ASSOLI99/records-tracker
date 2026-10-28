import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useT } from '@/state/app';
import { ALL_ICONS, searchIcons } from '@/themes/icons';
import { Field, Icon, IconBtn, Row, Txt } from './kit';
import { Sheet } from './overlays';
import { alpha, useTheme } from './theme';
import { hhmm, pad2 } from '@/model/util';

export function NumberStepper({ value, onChange, min = 0, max = 9999, step = 1, suffix }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const th = useTheme();
  return (
    <Row gap={6} style={{ backgroundColor: th.colors.surface2, borderRadius: th.radius, borderWidth: th.borderWidth, borderColor: th.colors.border, alignSelf: 'flex-start' }}>
      <IconBtn name="minus" size={18} onPress={() => onChange(Math.max(min, value - step))} />
      <Txt variant="h3" style={{ minWidth: 44, textAlign: 'center' }}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Txt>
      <IconBtn name="plus" size={18} onPress={() => onChange(Math.min(max, value + step))} />
    </Row>
  );
}

/** Hour/minute picker built from steppers (no native date picker dependency). */
export function TimeField({ hour, minute, onChange, label }: { hour: number; minute: number; onChange: (h: number, m: number) => void; label?: string }) {
  const th = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt variant="label" dim>{label}</Txt> : null}
      <Row gap={4} style={{ alignSelf: 'flex-start', direction: 'ltr', backgroundColor: th.colors.surface2, borderRadius: th.radius, borderWidth: th.borderWidth, borderColor: th.colors.border, paddingHorizontal: 4 }}>
        <IconBtn name="chevron-down" size={18} onPress={() => onChange((hour + 23) % 24, minute)} />
        <Txt variant="h2" style={{ minWidth: 34, textAlign: 'center' }}>{pad2(hour)}</Txt>
        <IconBtn name="chevron-up" size={18} onPress={() => onChange((hour + 1) % 24, minute)} />
        <Txt variant="h2">:</Txt>
        <IconBtn name="chevron-down" size={18} onPress={() => onChange(hour, (minute + 45) % 60)} />
        <Txt variant="h2" style={{ minWidth: 34, textAlign: 'center' }}>{pad2(minute)}</Txt>
        <IconBtn name="chevron-up" size={18} onPress={() => onChange(hour, (minute + 15) % 60)} />
      </Row>
    </View>
  );
}

export { hhmm };

const IconCell = memo(function IconCell({ name, selected, onPress }: { name: string; selected: boolean; onPress: (n: string) => void }) {
  const th = useTheme();
  return (
    <Pressable
      onPress={() => onPress(name)}
      style={{
        flex: 1,
        aspectRatio: 1,
        margin: 4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? alpha(th.colors.primary, 0.2) : th.colors.surface2,
        borderWidth: selected ? 2 : 0,
        borderColor: th.colors.primary,
      }}
    >
      <Icon name={name} size={26} color={selected ? th.colors.primary : th.colors.text} />
    </Pressable>
  );
});

/** Searchable picker over the full Material Community icon set (~7,400 icons). */
export function IconPicker({ visible, value, onClose, onPick }: { visible: boolean; value?: string | null; onClose: () => void; onPick: (name: string | null) => void }) {
  const t = useT();
  const [q, setQ] = useState('');
  const results = useMemo(() => searchIcons(q), [q]);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('icon.title')} scroll={false}>
      <Field value={q} onChangeText={setQ} placeholder={t('icon.search', { n: ALL_ICONS.length.toLocaleString() })} autoCorrect={false} autoCapitalize="none" />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="tiny" dim>{q ? results.length : ''}</Txt>
        {value ? (
          <Pressable onPress={() => onPick(null)}>
            <Txt variant="small" dim>{t('status.noIcon')}</Txt>
          </Pressable>
        ) : null}
      </Row>
      {results.length === 0 ? <Txt dim center>{t('icon.none', { q })}</Txt> : null}
      <View style={{ height: 380 }}>
        <FlatList keyboardShouldPersistTaps="handled" initialNumToRender={36} windowSize={5}
          data={results}
          numColumns={6}
          keyExtractor={(n) => n}
          renderItem={({ item }) => <IconCell name={item} selected={item === value} onPress={onPick} />}
        />
      </View>
    </Sheet>
  );
}
