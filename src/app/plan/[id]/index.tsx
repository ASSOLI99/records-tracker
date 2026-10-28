import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoalEditor, GoalsDrawer, GoalsTab } from '@/components/journey/Goals';
import { JourneyCards, JourneyMap, JourneyTimeline, type JourneyViewProps } from '@/components/journey/JourneyViews';
import { PinMenu } from '@/components/journey/PinMenu';
import { StatusEditor, type StatusSave } from '@/components/journey/StatusEditor';
import { StatusIsland } from '@/components/journey/StatusIsland';
import { buildJourney } from '@/model/journey';
import { computePeriods, currentTrigger, endReached } from '@/model/periods';
import { MAX_STATUSES, streak } from '@/model/progress';
import type { Goal, JourneyView, Status } from '@/model/types';
import { nowIso, uid } from '@/model/util';
import { useApp, usePlan } from '@/state/app';
import { getTheme } from '@/themes/themes';
import { Btn, Icon, Txt } from '@/ui/kit';
import { confirm, notify } from '@/ui/overlays';
import { ThemeProvider, alpha, localizeTheme, useDir } from '@/ui/theme';

function ViewSwitcher({ value, onChange, theme }: { value: JourneyView; onChange: (v: JourneyView) => void; theme: ReturnType<typeof getTheme> }) {
  const { t } = useApp();
  const opts: { v: JourneyView; icon: string; label: string }[] = [
    { v: 'map', icon: 'map-outline', label: t('view.map') },
    { v: 'cards', icon: 'view-grid-outline', label: t('view.cards') },
    { v: 'timeline', icon: 'format-list-bulleted', label: t('view.timeline') },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: alpha(theme.colors.surface, 0.96), borderRadius: 999, borderWidth: theme.borderWidth, borderColor: theme.colors.border, padding: 4, gap: 2, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 }}>
      {opts.map((o) => {
        const active = o.v === value;
        return (
          <Pressable key={o.v} accessibilityLabel={o.label} onPress={() => onChange(o.v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: active ? theme.colors.primary : 'transparent' }}>
            <Icon name={o.icon} size={18} color={active ? theme.colors.onPrimary : theme.colors.textDim} />
            {active ? <Text style={{ color: theme.colors.onPrimary, fontWeight: '800', fontSize: 12, fontFamily: theme.font.body }}>{o.label}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id);
  const { t, lang, updatePlan } = useApp();
  const { direction } = useDir();
  const insets = useSafeAreaInsets();
  const [islandH, setIslandH] = useState(120);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalEditorOpen, setGoalEditorOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  // Bumped on every editor opening so the sheet remounts with a fresh draft.
  const [editorKey, setEditorKey] = useState(0);
  // The open step moves as time passes: recompute on focus and every minute.
  const [tick, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((x) => x + 1), []));
  useEffect(() => {
    const timer = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const derived = useMemo(() => {
    if (!plan) return null;
    const periods = computePeriods(plan, new Date());
    return {
      periods,
      items: buildJourney(plan, periods, new Date()),
      streak: streak(plan, periods),
      endReached: endReached(plan, periods),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, tick]);

  const theme = localizeTheme(getTheme(plan?.themeId), lang);
  const readOnly = !!plan?.finishedAt;

  const openStep = useCallback((key: string) => router.push(`/plan/${id}/step/${encodeURIComponent(key)}`), [id]);

  const finish = useCallback(async () => {
    if (!plan) return;
    if (!(await confirm(t, t('journey.finished'), t('journey.finishConfirm', { name: plan.name }), { ok: t('common.yes') }))) return;
    await updatePlan(plan.id, (p) => ({ ...p, finishedAt: nowIso() }));
  }, [plan, t, updatePlan]);

  if (!plan || !derived) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, direction }}>
        <Txt dim>{t('step.notFound')}</Txt>
        <Btn label={t('common.back')} onPress={() => router.replace('/')} />
      </View>
    );
  }

  const saveStatus = async ({ status, markFrom }: StatusSave) => {
    setStatusOpen(false);
    await updatePlan(plan.id, (p) => {
      const exists = p.statuses.some((s) => s.id === status.id);
      if (!exists && p.statuses.length >= MAX_STATUSES) return p;
      return {
        ...p,
        statuses: exists ? p.statuses.map((s) => (s.id === status.id ? status : s)) : [...p.statuses, status],
        events:
          markFrom !== undefined
            ? [...p.events, { id: uid(), at: nowIso(), kind: 'status', title: status.name || '•', from: `${markFrom}${status.unit ? ` ${status.unit}` : ''}`, to: `${status.current}${status.unit ? ` ${status.unit}` : ''}`, icon: status.icon ?? null, refId: status.id }]
            : p.events,
      };
    });
  };

  const deleteStatus = async (s: Status) => {
    setStatusOpen(false);
    await updatePlan(plan.id, (p) => ({ ...p, statuses: p.statuses.filter((x) => x.id !== s.id) }));
  };

  const addGoalEvent = async (g: Goal) => {
    if (await confirm(t, t('goals.achieved', { name: g.title }), t('goals.addToMap'), { ok: t('common.yes'), cancel: t('common.no') })) {
      await updatePlan(plan.id, (p) => ({ ...p, events: [...p.events, { id: uid(), at: nowIso(), kind: 'goal', title: g.title, refId: g.id }] }));
    }
  };

  const toggleGoal = async (g: Goal) => {
    const completing = !g.completed;
    if (!(await confirm(t, completing ? t('goals.completeConfirm', { name: g.title }) : t('goals.uncompleteConfirm', { name: g.title })))) return;
    await updatePlan(plan.id, (p) => ({ ...p, goals: p.goals.map((x) => (x.id === g.id ? { ...x, completed: completing, completedAt: completing ? nowIso() : null, updatedAt: nowIso() } : x)) }));
    if (completing) await addGoalEvent(g);
  };

  const saveGoal = async (g: Goal, completedNow: boolean) => {
    setGoalEditorOpen(false);
    await updatePlan(plan.id, (p) => ({ ...p, goals: p.goals.some((x) => x.id === g.id) ? p.goals.map((x) => (x.id === g.id ? g : x)) : [...p.goals, g] }));
    if (completedNow) await addGoalEvent(g);
  };

  const deleteGoal = async (g: Goal) => {
    setGoalEditorOpen(false);
    await updatePlan(plan.id, (p) => ({ ...p, goals: p.goals.filter((x) => x.id !== g.id) }));
  };

  const addManualStep = async () => {
    if (!(await confirm(t, t('journey.addStep'), t('journey.addStepConfirm')))) return;
    await updatePlan(plan.id, (p) => ({ ...p, manualSteps: [...p.manualSteps, { id: uid(), at: nowIso() }] }));
  };

  const totalSteps = plan.endRule.type === 'steps' ? plan.endRule.steps ?? null : null;
  const bottomBar = insets.bottom + 18;
  const viewProps: JourneyViewProps = {
    plan,
    items: derived.items,
    endReached: derived.endReached,
    totalSteps,
    onOpenStep: openStep,
    onFinish: finish,
    topInset: islandH + 14,
    bottomInset: bottomBar + 90,
  };
  const manual = currentTrigger(plan).type === 'manual';

  return (
    <ThemeProvider theme={theme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <LinearGradient colors={[theme.colors.bg, theme.colors.bg2]} style={{ flex: 1, direction }}>
        {plan.view === 'map' ? <JourneyMap {...viewProps} /> : plan.view === 'cards' ? <JourneyCards {...viewProps} /> : <JourneyTimeline {...viewProps} />}

        <StatusIsland
          statuses={plan.statuses}
          streak={derived.streak}
          readOnly={readOnly}
          onHeight={setIslandH}
          onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          onAddStatus={() => {
            if (plan.statuses.length >= MAX_STATUSES) return notify(t('status.max'));
            setEditingStatus(null);
            setEditorKey((k) => k + 1);
            setStatusOpen(true);
          }}
          onOpenStatus={(s) => {
            if (readOnly) return notify(t('step.readOnly'));
            setEditingStatus(s);
            setEditorKey((k) => k + 1);
            setStatusOpen(true);
          }}
        />

        <GoalsTab goals={plan.goals} onPress={() => setGoalsOpen(true)} top={islandH + 40} />

        <View pointerEvents="box-none" style={{ position: 'absolute', bottom: bottomBar, start: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ViewSwitcher value={plan.view} theme={theme} onChange={(v) => updatePlan(plan.id, (p) => ({ ...p, view: v }))} />
          {manual && !readOnly ? <Btn small icon="plus" label={t('journey.addStep')} onPress={addManualStep} /> : null}
        </View>

        <PinMenu
          bottom={bottomBar}
          actions={[
            { key: 'triggers', icon: 'timer-cog-outline', label: t('pin.triggers'), onPress: () => router.push(`/plan/${plan.id}/triggers`) },
            { key: 'template', icon: 'file-document-edit-outline', label: t('pin.template'), onPress: () => router.push(`/plan/${plan.id}/template`) },
            { key: 'plan', icon: 'cog-outline', label: t('pin.plan'), onPress: () => router.push(`/plan/${plan.id}/edit`) },
          ]}
        />

        <GoalsDrawer
          open={goalsOpen}
          goals={plan.goals}
          readOnly={readOnly}
          onClose={() => setGoalsOpen(false)}
          onToggle={toggleGoal}
          onAdd={() => {
            setEditingGoal(null);
            setEditorKey((k) => k + 1);
            setGoalEditorOpen(true);
          }}
          onOpenGoal={(g) => {
            if (readOnly) return;
            setEditingGoal(g);
            setEditorKey((k) => k + 1);
            setGoalEditorOpen(true);
          }}
        />

        <StatusEditor key={`s${editorKey}`} visible={statusOpen} status={editingStatus} all={plan.statuses} onClose={() => setStatusOpen(false)} onSave={saveStatus} onDelete={deleteStatus} />
        <GoalEditor key={`g${editorKey}`} visible={goalEditorOpen} goal={editingGoal} onClose={() => setGoalEditorOpen(false)} onSave={saveGoal} onDelete={deleteGoal} />
      </LinearGradient>
    </ThemeProvider>
  );
}
