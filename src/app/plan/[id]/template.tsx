import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { TemplateEditor, cleanFields } from '@/components/TemplateEditor';
import type { TemplateField } from '@/model/types';
import { nowIso, uid } from '@/model/util';
import { useApp, usePlan } from '@/state/app';
import { getTheme } from '@/themes/themes';
import { Btn, Card, Icon, Txt } from '@/ui/kit';
import { Header, Screen, confirm } from '@/ui/overlays';
import { ThemeProvider } from '@/ui/theme';

function latestFields(fields: TemplateField[] | undefined): TemplateField[] {
  return JSON.parse(JSON.stringify(fields ?? []));
}

export default function TemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan(id);
  const { t, updatePlan } = useApp();
  const latest = plan ? [...plan.templates].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)).pop() : undefined;
  const [fields, setFields] = useState<TemplateField[]>(() => latestFields(latest?.fields));
  if (!plan) return null;
  const theme = getTheme(plan.themeId);
  const dirty = JSON.stringify(cleanFields(fields)) !== JSON.stringify(cleanFields(latest?.fields ?? []));

  const save = async () => {
    if (!(await confirm(t, t('template.edit.confirm')))) return;
    await updatePlan(plan.id, (p) => ({ ...p, templates: [...p.templates, { id: uid(), effectiveFrom: nowIso(), fields: cleanFields(fields) }] }));
    router.back();
  };

  return (
    <ThemeProvider theme={theme}>
      <Screen>
        <Header title={t('template.edit.title')} subtitle={plan.name} onBack={() => router.back()} />
        <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="information-outline" color={theme.colors.accent} />
          <Txt variant="small" style={{ flex: 1 }}>
            {t('template.edit.note')}
          </Txt>
        </Card>
        <TemplateEditor fields={fields} onChange={setFields} />
        <Btn label={t('common.save')} icon="check" disabled={!dirty} onPress={save} />
      </Screen>
    </ThemeProvider>
  );
}
