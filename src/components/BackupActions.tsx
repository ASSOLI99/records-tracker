import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { isValidBackup } from '@/model/backup';
import { InvalidBackupError, exportBackup, inspectBackup, restoreBackup } from '@/storage/backup';
import { useApp } from '@/state/app';
import { Btn, Row, Txt } from '@/ui/kit';
import { confirm, notify } from '@/ui/overlays';
import { useTheme } from '@/ui/theme';

/** Export and restore buttons. `exportable` is off during onboarding, where there's nothing to export yet. */
export function BackupActions({ exportable = true, onRestored }: { exportable?: boolean; onRestored?: () => void }) {
  const th = useTheme();
  const { t, root, reload } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  const doExport = async () => {
    if (!root) return;
    setBusy(t('backup.exporting', { done: 0, total: '…' }));
    try {
      const file = await exportBackup(root, (done, total) => setBusy(t('backup.exporting', { done, total })));
      setBusy(null);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: t('backup.shareTitle') });
      } else {
        notify(t('backup.saved'), t('backup.savedBody', { name: file.name }));
      }
    } catch (e) {
      notify(t('backup.failed'), String((e as Error)?.message ?? e));
    } finally {
      setBusy(null);
    }
  };

  const doRestore = async () => {
    if (!root) return;
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const file = new File(res.assets[0].uri);
    let started = false;
    try {
      setBusy(t('backup.restoring'));
      const summary = await inspectBackup(file);
      setBusy(null);
      if (!isValidBackup(summary)) return notify(t('backup.invalid'));
      const body = t('backup.restoreBody', { plans: summary.plans.length }) + (summary.hasMe ? `\n\n${t('backup.restoreBodyMe')}` : '');
      if (!(await confirm(t, t('backup.restoreConfirm'), body, { ok: t('backup.restoreOk') }))) return;
      setBusy(t('backup.restoring'));
      started = true;
      const done = await restoreBackup(root, file);
      await reload();
      notify(t('backup.restored'), t('backup.restoredBody', { plans: done.plans.length }));
      onRestored?.();
    } catch (e) {
      if (e instanceof InvalidBackupError) notify(t('backup.invalid'));
      else notify(started ? t('backup.failedRestore') : t('backup.failed'), String((e as Error)?.message ?? e));
    } finally {
      setBusy(null);
      if (file.exists) file.delete();
    }
  };

  if (busy)
    return (
      <Row style={{ paddingVertical: 10, justifyContent: 'center' }}>
        <ActivityIndicator color={th.colors.primary} />
        <Txt variant="small" dim>
          {busy}
        </Txt>
      </Row>
    );

  return (
    <View style={{ gap: 10 }}>
      {exportable ? (
        <>
          <Btn icon="archive-arrow-down-outline" label={t('backup.export')} onPress={doExport} />
          <Txt variant="tiny" dim>
            {t('backup.exportHint')}
          </Txt>
        </>
      ) : null}
      <Btn variant="secondary" icon="archive-arrow-up-outline" label={t('backup.restore')} onPress={doRestore} />
      {!exportable ? (
        <Txt variant="tiny" dim center>
          {t('backup.restoreHint')}
        </Txt>
      ) : null}
    </View>
  );
}
