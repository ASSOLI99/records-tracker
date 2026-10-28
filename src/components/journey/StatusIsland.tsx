import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Status } from '@/model/types';
import { MAIN_STATUSES, MAX_STATUSES, nextStreakMilestone, orderedStatuses, statusReached, streakTier } from '@/model/progress';
import { useApp } from '@/state/app';
import { isIcon } from '@/themes/icons';
import { Icon, IconBtn } from '@/ui/kit';
import { notify } from '@/ui/overlays';
import { ARABIC_FONT, alpha, useTheme } from '@/ui/theme';

const TIER_FONT = [18, 22, 26, 30, 34, 38, 44];
const TIER_ICON = [18, 21, 24, 27, 30, 34, 38];

export function StreakBadge({ current, best }: { current: number; best: number }) {
  const th = useTheme();
  const { t } = useApp();
  const tier = streakTier(current);
  const color = tier >= 5 ? '#ffb800' : tier >= 3 ? th.colors.warning : tier >= 1 ? th.colors.accent : th.colors.textDim;
  const next = nextStreakMilestone(current);
  return (
    <Pressable
      accessibilityLabel={t('streak.title')}
      onPress={() => notify(`${t('streak.title')}: ${current}`, [t('streak.best', { n: best }), next ? t('streak.next', { n: next }) : t('streak.max'), '', t('streak.info')].join('\n'))}
      style={{ minWidth: 54, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}
    >
      <View
        style={
          tier >= 2
            ? { shadowColor: color, shadowOpacity: 0.9, shadowRadius: 4 + tier * 2, shadowOffset: { width: 0, height: 0 } }
            : undefined
        }
      >
        <Icon name={tier >= 6 ? 'crown' : th.streakIcon} size={TIER_ICON[tier]} color={color} />
      </View>
      <Text style={{ color, fontSize: TIER_FONT[tier], lineHeight: th.font.heading === ARABIC_FONT ? undefined : TIER_FONT[tier] + 4, fontWeight: '900', fontFamily: th.font.heading }}>{current}</Text>
    </Pressable>
  );
}

function arrowFor(s: Status): string {
  if (s.kind === 'text' || s.direction === 'match') return 'equal';
  return s.direction === 'higher' ? 'arrow-up-thin' : 'arrow-down-thin';
}

function StatusChip({ s, onPress, compact }: { s: Status; onPress: () => void; compact?: boolean }) {
  const th = useTheme();
  const reached = statusReached(s);
  const color = reached ? th.colors.success : th.colors.text;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        paddingVertical: compact ? 4 : 6,
        paddingHorizontal: 4,
        borderRadius: Math.max(th.radius - 4, 6),
        backgroundColor: pressed ? alpha(th.colors.primary, 0.15) : reached ? alpha(th.colors.success, 0.12) : 'transparent',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' }}>
        {isIcon(s.icon) ? <Icon name={s.icon} size={16} color={th.colors.primary} /> : null}
        {s.name ? (
          <Text numberOfLines={1} style={{ color: th.colors.textDim, fontSize: 10, fontWeight: '700', flexShrink: 1, fontFamily: th.font.body }}>
            {s.name}
          </Text>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ color, fontSize: 15, fontWeight: '900', fontFamily: th.font.heading }}>
        {s.current || '—'}
        {s.unit ? <Text style={{ fontSize: 10, fontWeight: '700', fontFamily: th.font.body }}> {s.unit}</Text> : null}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
        <Icon name={reached ? 'check-circle' : arrowFor(s)} size={11} color={reached ? th.colors.success : th.colors.textDim} />
        <Text numberOfLines={1} style={{ color: th.colors.textDim, fontSize: 10, fontFamily: th.font.body }}>
          {s.target || '—'}
        </Text>
      </View>
    </Pressable>
  );
}

function AddTile({ onPress, label }: { onPress: () => void; label?: string }) {
  const th = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: label ? 1 : undefined, minWidth: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4, paddingVertical: 10, borderRadius: Math.max(th.radius - 4, 6), borderWidth: 1.5, borderStyle: 'dashed', borderColor: th.colors.border }}
    >
      <Icon name="plus" size={18} color={th.colors.primary} />
      {label ? <Text style={{ color: th.colors.primary, fontWeight: '700', fontSize: 13, fontFamily: th.font.body }}>{label}</Text> : null}
    </Pressable>
  );
}

/**
 * Floating top island: streak (start), current statuses (centre), close (end).
 * The first three statuses are always visible; the rest (up to four) slide down
 * into a row above them when the handle is pulled.
 */
export function StatusIsland({
  statuses,
  streak,
  onClose,
  onOpenStatus,
  onAddStatus,
  onHeight,
  readOnly,
}: {
  statuses: Status[];
  streak: { current: number; best: number };
  onClose: () => void;
  onOpenStatus: (s: Status) => void;
  onAddStatus: () => void;
  onHeight: (h: number) => void;
  readOnly?: boolean;
}) {
  const th = useTheme();
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const ordered = orderedStatuses(statuses);
  const main = ordered.slice(0, MAIN_STATUSES);
  const extra = ordered.slice(MAIN_STATUSES);
  const canAdd = !readOnly && statuses.length < MAX_STATUSES;
  const showHandle = statuses.length > 0 && (extra.length > 0 || canAdd);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View
      pointerEvents="box-none"
      onLayout={(e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height + e.nativeEvent.layout.y)}
      style={{ position: 'absolute', top: insets.top + 6, left: 10, right: 10 }}
    >
      <View
        style={{
          backgroundColor: alpha(th.colors.surface, th.dark ? 0.94 : 0.97),
          borderRadius: Math.max(th.radius, 14) + 10,
          borderWidth: th.borderWidth,
          borderColor: th.colors.border,
          paddingHorizontal: 6,
          paddingTop: 6,
          paddingBottom: showHandle ? 0 : 6,
          shadowColor: th.glow ? th.colors.primary : '#000',
          shadowOpacity: th.glow ? 0.5 : 0.18,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        }}
      >
        {open ? (
          <View style={{ flexDirection: 'row', gap: 4, paddingBottom: 6, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: th.colors.border }}>
            {extra.map((s) => (
              <StatusChip key={s.id} s={s} compact onPress={() => onOpenStatus(s)} />
            ))}
            {canAdd ? <AddTile onPress={onAddStatus} label={extra.length === 0 ? t('status.add') : undefined} /> : null}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <StreakBadge current={streak.current} best={streak.best} />
          <View style={{ flex: 1, flexDirection: 'row', gap: 4, alignItems: 'stretch' }}>
            {main.length === 0 ? (
              readOnly ? null : <AddTile onPress={onAddStatus} label={t('status.add')} />
            ) : (
              main.map((s) => <StatusChip key={s.id} s={s} onPress={() => onOpenStatus(s)} />)
            )}
          </View>
          <IconBtn name="close" onPress={onClose} bg={th.colors.surface2} label={t('common.close')} />
        </View>
        {showHandle ? (
          <Pressable onPress={toggle} hitSlop={10} style={{ alignItems: 'center', paddingVertical: 2, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={th.colors.textDim} />
            {!open && extra.length ? <Text style={{ color: th.colors.textDim, fontSize: 10, fontWeight: '700', fontFamily: th.font.body }}>{t('status.more', { n: extra.length })}</Text> : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
