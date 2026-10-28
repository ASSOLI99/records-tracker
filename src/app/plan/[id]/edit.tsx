import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ThemePicker } from '@/components/ThemePicker';
import type { JourneyView } from '@/model/types';
import { useApp, usePlan } from '@/state/app';
import { getTheme } from '@/themes/themes';
import { Btn, Card, Field, Icon, Section, Segmented, Txt } from '@/ui/kit';
import { Header, Screen, confirm, notify } from '@/ui/overlays';
import { IconPicker } from '@/ui/pickers';
import { ThemeProvider } from '@/ui/theme';

export default function EditPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id);
  const { t, updatePlan, deletePlan } = useApp();
  const [name, setName] = useState(plan?.name ?? '');
  const [icon, setIcon] = useState<string | null>(plan?.icon ?? null);
  const [themeId, setThemeId] = useState(plan?.themeId ?? 'minimal');
  const [view, setView] = useState<JourneyView>(plan?.view ?? 'map');
  const [iconOpen, setIconOpen] = useState(false);
  if (!plan) return null;
  const theme = getTheme(themeId);
  const dirty = name.trim() !== plan.name || icon !== (plan.icon ?? null) || themeId !== plan.themeId || view !== plan.view;

  const save = async () => {
    if (!name.trim()) return notify(t('plan.new.nameRequired'));
    if (!(await confirm(t, t('common.saveChanges')))) return;
    // The folder keeps its original name so links to it (and backups) stay valid.
    await updatePlan(plan.id, (p) => ({ ...p, name: name.trim(), icon, themeId, view }));
    router.back();
  };

  const reopen = async () => {
    if (!(await confirm(t, t('plan.edit.reopen'), t('plan.edit.reopenConfirm')))) return;
    await updatePlan(plan.id, (p) => ({ ...p, finishedAt: null }));
    router.back();
  };

  const remove = async () => {
    if (!(await confirm(t, t('plan.edit.delete'), t('plan.edit.deleteConfirm', { name: plan.name }), { destructive: true }))) return;
    await deletePlan(plan.id);
    router.dismissAll();
    router.replace('/');
  };

  return (
    <ThemeProvider theme={theme}>
      <Screen>
        <Header title={t('plan.edit.title')} subtitle={plan.name} onBack={() => router.back()} />
        <Field label={t('plan.edit.name')} value={name} onChangeText={setName} maxLength={60} />
        <Card onPress={() => setIconOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name={icon ?? theme.heroIcon} size={28} color={theme.colors.primary} />
          <Txt style={{ flex: 1 }}>{t('status.icon')}</Txt>
          <Icon name="chevron-down" />
        </Card>
        <Section title={t('plan.edit.view')}>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'map', label: t('view.map'), icon: 'map-outline' },
              { value: 'cards', label: t('view.cards'), icon: 'view-grid-outline' },
              { value: 'timeline', label: t('view.timeline'), icon: 'format-list-bulleted' },
            ]}
          />
        </Section>
        <Section title={t('plan.edit.theme')}>
          <ThemePicker value={themeId} onChange={setThemeId} />
        </Section>
        <Btn label={t('common.save')} icon="check" disabled={!dirty} onPress={save} />
        {plan.finishedAt ? <Btn variant="secondary" icon="restore" label={t('plan.edit.reopen')} onPress={reopen} /> : null}
        <Btn variant="danger" icon="trash-can-outline" label={t('plan.edit.delete')} onPress={remove} />
        <IconPicker
          visible={iconOpen}
          value={icon}
          onClose={() => setIconOpen(false)}
          onPick={(n) => {
            setIcon(n);
            setIconOpen(false);
          }}
        />
      </Screen>
    </ThemeProvider>
  );
}
