import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import type { Lang, MeField } from '@/model/types';
import { nowIso } from '@/model/util';
import { describeRoot, usesFolderPicker } from '@/storage/fs';
import { useApp } from '@/state/app';
import { Btn, Card, Field, Icon, Row, Segmented, Txt } from '@/ui/kit';
import { MeFieldsEditor } from '@/components/MeFieldsEditor';
import { makeT } from '@/i18n';
import { Screen, notify } from '@/ui/overlays';
import { useTheme } from '@/ui/theme';

type Step = 'welcome' | 'storage' | 'restored' | 'name' | 'extra';

export default function Onboarding() {
  const th = useTheme();
  const { t, lang, setLang, phase, root, me, plans, pickFolder, reload, saveMe } = useApp();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [fields, setFields] = useState<MeField[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (phase === 'ready' && step !== 'restored' && step !== 'extra') router.replace('/');
  }, [phase, step]);

  const changeLang = (l: Lang) => {
    if (setLang(l)) notify(makeT(l)('onb.language'), makeT(l)('settings.languageRestart'));
  };

  const choose = async () => {
    setBusy(true);
    try {
      const res = await pickFolder();
      if (!res) return;
      setStep(res.existing ? 'restored' : 'name');
    } catch {
      notify(t('onb.storage.failed'));
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    await reload();
    setBusy(false);
  };

  const finish = async (withFields: boolean) => {
    const now = nowIso();
    const clean = withFields ? fields.filter((f) => f.label.trim()).map((f) => ({ ...f, label: f.label.trim(), value: f.value.trim() })) : [];
    await saveMe({ version: 1, name: name.trim(), fields: clean, createdAt: now, updatedAt: now });
    router.replace('/');
  };

  return (
    <Screen style={{ flexGrow: 1, justifyContent: 'center' }}>
      {step === 'welcome' ? (
        <View style={{ gap: 22 }}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: th.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="map-marker-path" size={56} color={th.colors.onPrimary} />
            </View>
            <Txt variant="display" center>{t('app.name')}</Txt>
            <Txt variant="h2" center>{t('onb.welcome.title')}</Txt>
            <Txt dim center>{t('onb.welcome.body')}</Txt>
          </View>
          <View style={{ gap: 8 }}>
            <Txt variant="label" dim>{t('onb.language')}</Txt>
            <Segmented value={lang} onChange={changeLang} options={[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]} />
          </View>
          <Btn label={t('onb.start')} icon="arrow-right-thin" onPress={() => setStep('storage')} />
        </View>
      ) : null}

      {step === 'storage' ? (
        <View style={{ gap: 18 }}>
          <Icon name="folder-heart-outline" size={64} color={th.colors.primary} style={{ alignSelf: 'center' }} />
          <Txt variant="h1" center>{t('onb.storage.title')}</Txt>
          <Txt dim>{usesFolderPicker ? t('onb.storage.androidBody') : t('onb.storage.iosBody')}</Txt>
          <Card style={{ gap: 6 }}>
            <Row>
              <Icon name="backup-restore" color={th.colors.accent} />
              <Txt variant="small" style={{ flex: 1 }}>{usesFolderPicker ? t('onb.storage.restoreHint') : t('onb.storage.iosRestore')}</Txt>
            </Row>
          </Card>
          {usesFolderPicker ? (
            <Btn icon="folder-open-outline" label={t('onb.storage.pick')} onPress={choose} disabled={busy} />
          ) : (
            <>
              <Txt variant="tiny" dim>{describeRoot(root, t)}</Txt>
              {phase === 'ready' && me ? null : <Btn label={t('onb.storage.continue')} onPress={() => setStep('name')} />}
              <Btn variant="secondary" icon="refresh" label={t('onb.storage.checkAgain')} onPress={recheck} disabled={busy} />
            </>
          )}
        </View>
      ) : null}

      {step === 'restored' && me ? (
        <View style={{ gap: 18, alignItems: 'center' }}>
          <Icon name="party-popper" size={64} color={th.colors.primary} />
          <Txt variant="h1" center>{t('onb.restore.title', { name: me.name })}</Txt>
          <Txt dim center>{t('onb.restore.body', { plans: plans.length })}</Txt>
          <Btn style={{ alignSelf: 'stretch' }} label={t('onb.restore.go')} onPress={() => router.replace('/')} />
        </View>
      ) : null}

      {step === 'restored' && !me ? (
        // A record-tracker folder without me.json: treat as fresh.
        <Btn label={t('common.next')} onPress={() => setStep('name')} />
      ) : null}

      {step === 'name' ? (
        <View style={{ gap: 18 }}>
          <Icon name="account-heart-outline" size={64} color={th.colors.primary} style={{ alignSelf: 'center' }} />
          <Txt variant="h1" center>{t('onb.name.title')}</Txt>
          <Field value={name} onChangeText={setName} placeholder={t('onb.name.placeholder')} autoFocus returnKeyType="next" onSubmitEditing={() => name.trim() && setStep('extra')} />
          <Btn label={t('common.next')} disabled={!name.trim()} onPress={() => (name.trim() ? setStep('extra') : notify(t('onb.name.required')))} />
          {usesFolderPicker ? <Btn variant="ghost" label={t('common.back')} onPress={() => setStep('storage')} /> : null}
        </View>
      ) : null}

      {step === 'extra' ? (
        <View style={{ gap: 16 }}>
          <Txt variant="h1">{t('onb.extra.title')}</Txt>
          <Txt dim>{t('onb.extra.body')}</Txt>
          <MeFieldsEditor fields={fields} onChange={setFields} />
          <Btn label={t('onb.extra.finish')} icon="check" onPress={() => finish(true)} />
          <Btn variant="ghost" label={t('common.skip')} onPress={() => finish(false)} />
        </View>
      ) : null}
      {Platform.OS === 'web' ? <Txt variant="tiny" dim center>Mobile only</Txt> : null}
    </Screen>
  );
}
