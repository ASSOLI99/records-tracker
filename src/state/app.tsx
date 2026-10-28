import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import type { Directory } from 'expo-file-system';
import { deviceLang, makeT, rtl, type TFn } from '@/i18n';
import type { Lang, Me, Plan } from '@/model/types';
import { nowIso } from '@/model/util';
import { pickRoot, readConfig, resolveRoot, writeConfig } from '@/storage/fs';
import { deletePlanFolder, loadMe, loadPlans, savePlan, saveMe as writeMe, uniqueFolder } from '@/storage/repo';
import { cancelPlanReminders, rescheduleAll, schedulePlanReminders } from '@/notifications';

export type Phase = 'loading' | 'needsStorage' | 'needsName' | 'ready';

interface AppState {
  phase: Phase;
  root: Directory | null;
  me: Me | null;
  plans: Plan[];
  lang: Lang;
  t: TFn;
  /** Returns true when the app must restart for the layout direction to change. */
  setLang: (lang: Lang) => boolean;
  pickFolder: () => Promise<{ existing: boolean } | null>;
  reload: () => Promise<void>;
  saveMe: (me: Me) => Promise<void>;
  addPlan: (plan: Omit<Plan, 'folder'>) => Promise<Plan>;
  updatePlan: (id: string, fn: (p: Plan) => Plan) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

/** Fields whose change means scheduled reminders must be rebuilt. */
function reminderKey(p: Plan): string {
  return JSON.stringify([p.name, p.segments, p.reminders, p.finishedAt, p.endRule]);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [root, setRoot] = useState<Directory | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [lang, setLangState] = useState<Lang>(() => readConfig().lang ?? deviceLang());
  const t = useMemo(() => makeT(lang), [lang]);
  // Mutations read the latest plans from this ref; every setPlans call updates it first.
  const plansRef = useRef<Plan[]>([]);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const loadFrom = useCallback(async (dir: Directory | null) => {
    const [m, ps] = await (dir ? Promise.all([loadMe(dir), loadPlans(dir)]) : Promise.resolve([null, [] as Plan[]] as const));
    setRoot(dir);
    if (!dir) {
      setMe(null);
      setPlans([]);
      plansRef.current = [];
      setPhase('needsStorage');
      return;
    }
    setMe(m);
    setPlans(ps);
    plansRef.current = ps;
    setPhase(m ? 'ready' : 'needsName');
    if (m) rescheduleAll(ps, tRef.current).catch(() => undefined);
  }, []);

  const reload = useCallback(() => loadFrom(resolveRoot()), [loadFrom]);

  useEffect(() => {
    rtl.apply(lang);
    // Loading from disk is the external system here; all state is set after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload().catch(() => setPhase('needsStorage'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((l: Lang) => {
    writeConfig({ lang: l });
    setLangState(l);
    return rtl.apply(l);
  }, []);

  const pickFolder = useCallback(async () => {
    const picked = await pickRoot();
    if (!picked) return null;
    await loadFrom(picked.root);
    return { existing: picked.existing };
  }, [loadFrom]);

  const saveMe = useCallback(
    async (next: Me) => {
      if (!root) throw new Error('no root');
      await writeMe(root, next);
      setMe(next);
      setPhase('ready');
    },
    [root],
  );

  const persist = useCallback(
    async (p: Plan) => {
      if (!root) return;
      try {
        await savePlan(root, p);
      } catch (e) {
        Alert.alert(tRef.current('common.error'), String((e as Error)?.message ?? e));
      }
    },
    [root],
  );

  const addPlan = useCallback(
    async (input: Omit<Plan, 'folder'>) => {
      if (!root) throw new Error('no root');
      const plan: Plan = { ...input, folder: uniqueFolder(root, input.name) };
      await savePlan(root, plan);
      const next = [plan, ...plansRef.current];
      plansRef.current = next;
      setPlans(next);
      schedulePlanReminders(plan, tRef.current).catch(() => undefined);
      return plan;
    },
    [root],
  );

  const updatePlan = useCallback(
    async (id: string, fn: (p: Plan) => Plan) => {
      const prev = plansRef.current.find((p) => p.id === id);
      if (!prev) return;
      const updated = { ...fn(prev), updatedAt: nowIso() };
      const next = plansRef.current.map((p) => (p.id === id ? updated : p));
      plansRef.current = next;
      setPlans(next);
      if (reminderKey(prev) !== reminderKey(updated)) schedulePlanReminders(updated, tRef.current).catch(() => undefined);
      await persist(updated);
    },
    [persist],
  );

  const deletePlan = useCallback(
    async (id: string) => {
      const plan = plansRef.current.find((p) => p.id === id);
      if (!plan || !root) return;
      deletePlanFolder(root, plan);
      await cancelPlanReminders(plan.id).catch(() => undefined);
      const next = plansRef.current.filter((p) => p.id !== id);
      plansRef.current = next;
      setPlans(next);
    },
    [root],
  );

  const value = useMemo<AppState>(
    () => ({ phase, root, me, plans, lang, t, setLang, pickFolder, reload, saveMe, addPlan, updatePlan, deletePlan }),
    [phase, root, me, plans, lang, t, setLang, pickFolder, reload, saveMe, addPlan, updatePlan, deletePlan],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}

export function useT(): TFn {
  return useApp().t;
}

export function usePlan(id: string | undefined): Plan | undefined {
  const { plans } = useApp();
  return plans.find((p) => p.id === id);
}
