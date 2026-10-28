import { useEffect, useState } from 'react';
import { Animated, BackHandler, I18nManager, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Difficulty, Goal, Priority } from '@/model/types';
import { nowIso, uid } from '@/model/util';
import { useApp } from '@/state/app';
import { Btn, Field, Icon, IconBtn, ProgressBar, Row, Segmented, Toggle, Txt } from '@/ui/kit';
import { Sheet, confirm, notify } from '@/ui/overlays';
import { alpha, useTheme } from '@/ui/theme';

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'epic'];
const PRIO_COLOR: Record<Priority, string> = { low: '#64748b', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
const DIFF_ICON: Record<Difficulty, string> = { easy: 'signal-cellular-1', medium: 'signal-cellular-2', hard: 'signal-cellular-3', epic: 'skull-outline' };

export function sortGoals(goals: Goal[]): Goal[] {
  return [...goals].sort(
    (a, b) => Number(a.completed) - Number(b.completed) || PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || a.createdAt.localeCompare(b.createdAt),
  );
}

function GoalRow({ goal, onToggle, onOpen, readOnly }: { goal: Goal; onToggle: () => void; onOpen: () => void; readOnly?: boolean }) {
  const th = useTheme();
  const { t } = useApp();
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: th.radius, backgroundColor: pressed ? th.colors.surface2 : th.colors.surface, borderWidth: th.borderWidth, borderColor: th.colors.border, opacity: goal.completed ? 0.7 : 1 })}>
      <IconBtn
        name={goal.completed ? 'check-circle' : 'circle-outline'}
        color={goal.completed ? th.colors.success : th.colors.textDim}
        onPress={readOnly ? undefined : onToggle}
        size={26}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontWeight: '700', textDecorationLine: goal.completed ? 'line-through' : 'none' }} numberOfLines={2}>
          {goal.title}
        </Txt>
        <Row gap={10}>
          <Row gap={4}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PRIO_COLOR[goal.priority] }} />
            <Text style={{ color: th.colors.textDim, fontSize: 11 }}>{t(`goals.prio.${goal.priority}` as 'goals.prio.low')}</Text>
          </Row>
          <Row gap={2}>
            <Icon name={DIFF_ICON[goal.difficulty]} size={13} color={th.colors.textDim} />
            <Text style={{ color: th.colors.textDim, fontSize: 11 }}>{t(`goals.diff.${goal.difficulty}` as 'goals.diff.easy')}</Text>
          </Row>
        </Row>
      </View>
    </Pressable>
  );
}

/** Slide-in drawer from the start edge listing the journey's goals. */
export function GoalsDrawer({
  open,
  goals,
  onClose,
  onToggle,
  onOpenGoal,
  onAdd,
  readOnly,
}: {
  open: boolean;
  goals: Goal[];
  onClose: () => void;
  onToggle: (g: Goal) => void;
  onOpenGoal: (g: Goal) => void;
  onAdd: () => void;
  readOnly?: boolean;
}) {
  const th = useTheme();
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelW = Math.min(360, width * 0.86);
  const [anim] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(open);

  if (open && !mounted) setMounted(true);
  useEffect(() => {
    Animated.timing(anim, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: true }).start(() => !open && setMounted(false));
  }, [open, anim]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  if (!mounted) return null;
  const done = goals.filter((g) => g.completed).length;
  // translateX isn't mirrored by RTL layout, so slide in from whichever edge is "start".
  const hidden = I18nManager.isRTL ? panelW : -panelW;

  return (
    // Elevation keeps the drawer above the floating pin button on Android.
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 50, elevation: 50 }}>
      <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#000', opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          start: 0,
          width: panelW,
          backgroundColor: th.colors.bg,
          borderEndWidth: th.borderWidth,
          borderColor: th.colors.border,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [hidden, 0] }) }],
        }}
      >
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <Icon name="flag-checkered" color={th.colors.primary} />
              <Txt variant="h2">{t('goals.title')}</Txt>
            </Row>
            <IconBtn name="close" onPress={onClose} />
          </Row>
          {goals.length ? (
            <>
              <ProgressBar value={done / goals.length} color={th.colors.success} height={8} />
              <Txt variant="tiny" dim>
                {t('goals.progress', { done, total: goals.length })}
              </Txt>
            </>
          ) : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {goals.length === 0 ? <Txt dim>{t('goals.empty')}</Txt> : null}
          {sortGoals(goals).map((g) => (
            <GoalRow key={g.id} goal={g} readOnly={readOnly} onToggle={() => onToggle(g)} onOpen={() => onOpenGoal(g)} />
          ))}
        </ScrollView>
        {!readOnly ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Btn icon="plus" label={t('goals.add')} onPress={onAdd} />
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

/** Vertical tab on the start edge that opens the goals drawer. */
export function GoalsTab({ goals, onPress, top }: { goals: Goal[]; onPress: () => void; top: number }) {
  const th = useTheme();
  const done = goals.filter((g) => g.completed).length;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        top,
        start: 0,
        paddingVertical: 12,
        paddingHorizontal: 7,
        borderTopEndRadius: 14,
        borderBottomEndRadius: 14,
        backgroundColor: alpha(th.colors.surface, 0.95),
        borderWidth: th.borderWidth,
        borderStartWidth: 0,
        borderColor: th.colors.border,
        alignItems: 'center',
        gap: 4,
        opacity: pressed ? 0.7 : 1,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
      })}
    >
      <Icon name="flag-checkered" size={20} color={th.colors.primary} />
      <Text style={{ color: th.colors.text, fontWeight: '800', fontSize: 11 }}>{goals.length ? `${done}/${goals.length}` : '+'}</Text>
    </Pressable>
  );
}

/** Remount with a new `key` per opening: the draft is taken from `goal` on mount. */
export function GoalEditor({ visible, goal, onClose, onSave, onDelete }: { visible: boolean; goal: Goal | null; onClose: () => void; onSave: (g: Goal, completedNow: boolean) => void; onDelete: (g: Goal) => void }) {
  const th = useTheme();
  const { t } = useApp();
  const [draft, setDraft] = useState<Goal>(() => {
    const now = nowIso();
    return goal ?? { id: uid(), title: '', description: '', priority: 'medium', difficulty: 'medium', completed: false, completedAt: null, createdAt: now, updatedAt: now };
  });
  const set = (p: Partial<Goal>) => setDraft({ ...draft, ...p });

  const save = async () => {
    const title = draft.title.trim();
    if (!title) return notify(t('goals.titleField'));
    if (goal && !(await confirm(t, t('common.saveChanges')))) return;
    const completedNow = draft.completed && !goal?.completed;
    onSave({ ...draft, title, description: draft.description?.trim(), completedAt: draft.completed ? draft.completedAt ?? nowIso() : null, updatedAt: nowIso() }, completedNow);
  };
  const remove = async () => {
    if (goal && (await confirm(t, t('common.areYouSure'), t('common.deleteConfirm', { name: goal.title }), { destructive: true }))) onDelete(goal);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={goal ? t('goals.edit') : t('goals.new')}
      footer={
        <Row gap={10}>
          {goal ? <Btn variant="danger" icon="trash-can-outline" onPress={remove} /> : null}
          <Btn style={{ flex: 1 }} icon="check" label={t('common.save')} onPress={save} />
        </Row>
      }
    >
      <Field label={t('goals.titleField')} value={draft.title} onChangeText={(title) => set({ title })} maxLength={80} />
      <Field label={`${t('goals.description')} (${t('common.optional')})`} value={draft.description ?? ''} onChangeText={(description) => set({ description })} multiline />
      <View style={{ gap: 6 }}>
        <Txt variant="label" dim>{t('goals.priority')}</Txt>
        <Segmented value={draft.priority} onChange={(priority) => set({ priority })} options={PRIORITIES.map((p) => ({ value: p, label: t(`goals.prio.${p}` as 'goals.prio.low'), color: PRIO_COLOR[p] }))} />
      </View>
      <View style={{ gap: 6 }}>
        <Txt variant="label" dim>{t('goals.difficulty')}</Txt>
        <Segmented value={draft.difficulty} onChange={(difficulty) => set({ difficulty })} options={DIFFICULTIES.map((d) => ({ value: d, label: t(`goals.diff.${d}` as 'goals.diff.easy'), icon: DIFF_ICON[d] }))} />
      </View>
      <Toggle value={draft.completed} onChange={(completed) => set({ completed })} label={t('goals.completed')} />
      {draft.completed ? (
        <Row>
          <Icon name="trophy-outline" color={th.colors.success} />
          <Txt variant="small" color={th.colors.success}>
            {t('goals.completed')}
          </Txt>
        </Row>
      ) : null}
    </Sheet>
  );
}
