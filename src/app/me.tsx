import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { MeFieldsEditor } from '@/components/MeFieldsEditor';
import type { Lang, Me, MeField } from '@/model/types';
import { nowIso } from '@/model/util';
import { describeRoot, usesFolderPicker } from '@/storage/fs';
import { useApp } from '@/state/app';
import { Btn, Card, Field, Icon, Row, Section, Segmented, Txt } from '@/ui/kit';
import { Header, Screen, confirm, notify } from '@/ui/overlays';
import { useTheme } from '@/ui/theme';

export default function MeScreen() {
  const { me } = useApp();
  if (!me) return null;
  // Remount the form whenever the stored profile changes so it starts from the saved values.
  return <MeForm key={me.updatedAt} me={me} />;
}

function MeForm({ me }: { me: Me }) {
  const th = useTheme();
  const { t, lang, setLang, saveMe, root, pickFolder } = useApp();
  const [name, setName] = useState(me.name);
  const [fields, setFields] = useState<MeField[]>(me.fields);

  const dirty = name.trim() !== me.name || JSON.stringify(fields) !== JSON.stringify(me.fields);

  const save = async () => {
    if (!name.trim()) return notify(t('onb.name.required'));
    if (!(await confirm(t, t('common.saveChanges')))) return;
    const clean = fields.filter((f) => f.label.trim()).map((f) => ({ ...f, label: f.label.trim(), value: f.value.trim() }));
    await saveMe({ ...me, name: name.trim(), fields: clean, updatedAt: nowIso() });
    notify(t('me.saved'));
  };

  const changeLang = (l: Lang) => {
    setLang(l);
  };

  const changeFolder = async () => {
    if (!(await confirm(t, t('settings.changeFolder'), t('settings.changeFolderBody')))) return;
    const res = await pickFolder();
    if (res) router.replace(res.existing ? '/' : '/onboarding');
  };

  return (
    <Screen>
      <Header title={t('me.title')} onBack={() => router.back()} />
      <Section title={t('me.name')}>
        <Field value={name} onChangeText={setName} placeholder={t('onb.name.placeholder')} />
      </Section>
      <Section title={t('me.fields')}>
        <MeFieldsEditor fields={fields} onChange={setFields} />
      </Section>
      <Btn label={t('common.save')} icon="content-save-outline" disabled={!dirty} onPress={save} />

      <Section title={t('onb.language')}>
        <Segmented value={lang} onChange={changeLang} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]} />
      </Section>

      <Section title={t('settings.storage')}>
        <Card style={{ gap: 10 }}>
          <Row>
            <Icon name="folder-outline" color={th.colors.primary} />
            <Txt variant="small" style={{ flex: 1 }}>
              {describeRoot(root, t)}
            </Txt>
          </Row>
          {usesFolderPicker ? <Btn variant="secondary" small icon="folder-swap-outline" label={t('settings.changeFolder')} onPress={changeFolder} /> : null}
        </Card>
      </Section>
      <Section title={t('settings.backup')}>
        <Card>
          <View style={{ gap: 8 }}>
            <Row>
              <Icon name="cloud-upload-outline" color={th.colors.accent} />
              <Txt variant="small" style={{ flex: 1 }}>
                {usesFolderPicker ? t('settings.backupBodyAndroid') : t('settings.backupBodyIos')}
              </Txt>
            </Row>
          </View>
        </Card>
      </Section>
    </Screen>
  );
}
