import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { FIELD_ICONS } from '@/components/TemplateEditor';
import { computePeriods } from '@/model/periods';
import { checklistItems, fieldCompletion, fieldsFor } from '@/model/progress';
import { dateTime, stepTitle } from '@/model/labels';
import type { Attachment, FieldValue, Note, Plan, StepRecord, TemplateField } from '@/model/types';
import { nowIso, uid } from '@/model/util';
import { attachmentUris, deleteAttachmentFile, importAttachment, openAttachment, type IncomingFile } from '@/storage/repo';
import { useApp, usePlan } from '@/state/app';
import { getTheme } from '@/themes/themes';
import { Btn, Card, Field, Icon, IconBtn, ProgressBar, Row, Section, Txt } from '@/ui/kit';
import { Header, Screen, Sheet, confirm, notify } from '@/ui/overlays';
import { ThemeProvider, alpha, useTheme } from '@/ui/theme';

function emptyRecord(key: string, periodStart: Date, fields: TemplateField[]): StepRecord {
  const now = nowIso();
  return { key, periodStart: periodStart.toISOString(), fields, values: {}, notes: [], attachments: [], createdAt: now, updatedAt: now };
}

/** Text input that saves when the user pauses or leaves the field. */
function AutoSaveText({ value, onSave, placeholder, disabled, multiline = true }: { value: string; onSave: (v: string) => void; placeholder?: string; disabled?: boolean; multiline?: boolean }) {
  const [text, setText] = useState(value);
  // Last value known to be stored. A different incoming value came from elsewhere, so adopt it.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Text typed but not yet saved; written out if the screen closes before the pause.
  const pending = useRef<string | null>(null);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current != null) saveRef.current(pending.current);
    },
    [],
  );
  const flush = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;
    if (v !== synced) {
      setSynced(v);
      onSave(v);
    }
  };
  return (
    <Field
      value={text}
      editable={!disabled}
      multiline={multiline}
      placeholder={placeholder}
      onChangeText={(v) => {
        setText(v);
        pending.current = v;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => flush(v), 800);
      }}
      onBlur={() => flush(text)}
    />
  );
}

function Thumb({ a, uri, onPress, onLongPress }: { a: Attachment; uri?: string; onPress: () => void; onLongPress?: () => void }) {
  const th = useTheme();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ width: 92, height: 92, borderRadius: Math.min(th.radius, 14), overflow: 'hidden', backgroundColor: th.colors.surface2, borderWidth: 1, borderColor: th.colors.border, alignItems: 'center', justifyContent: 'center' }}>
      {a.kind === 'image' && uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      ) : (
        <View style={{ alignItems: 'center', gap: 4, padding: 6 }}>
          <Icon name={a.kind === 'video' ? 'play-circle-outline' : 'file-document-outline'} size={34} color={th.colors.primary} />
          <Txt variant="tiny" dim numberOfLines={2} center>
            {a.originalName}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

function FieldInput({ field, value, set, readOnly, photos, onAddPhoto, onOpenAttachment, uris }: {
  field: TemplateField;
  value: FieldValue;
  set: (v: FieldValue) => void;
  readOnly: boolean;
  photos: Attachment[];
  onAddPhoto: () => void;
  onOpenAttachment: (a: Attachment) => void;
  uris: Map<string, string>;
}) {
  const th = useTheme();
  const { t } = useApp();
  const [newItem, setNewItem] = useState('');
  const completion = fieldCompletion(field, value);

  const header = (
    <Row>
      <Icon name={FIELD_ICONS[field.type]} size={20} color={th.colors.primary} />
      <Txt variant="h3" style={{ flex: 1 }}>
        {field.label}
      </Txt>
      {completion != null && field.type !== 'yesno' ? (
        <Txt variant="small" color={completion >= 1 ? th.colors.success : th.colors.textDim} style={{ fontWeight: '800' }}>
          {Math.round(completion * 100)}%
        </Txt>
      ) : null}
    </Row>
  );

  switch (field.type) {
    case 'mood':
      return (
        <Card style={{ gap: 12 }}>
          {header}
          <Row style={{ justifyContent: 'space-around' }} wrap>
            {(field.moodOptions ?? []).map((o) => {
              const selected = value.mood === o.id;
              return (
                <Pressable key={o.id} disabled={readOnly} onPress={() => set({ ...value, mood: selected ? null : o.id })} style={{ alignItems: 'center', gap: 6, minWidth: 72 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: o.color, borderWidth: selected ? 4 : 0, borderColor: th.colors.text, opacity: value.mood && !selected ? 0.35 : 1, alignItems: 'center', justifyContent: 'center' }}>
                    {selected ? <Icon name="check-bold" color="#fff" /> : null}
                  </View>
                  <Txt variant="small" style={{ fontWeight: selected ? '800' : '500' }}>
                    {o.label}
                  </Txt>
                </Pressable>
              );
            })}
          </Row>
        </Card>
      );
    case 'text':
      return (
        <Card style={{ gap: 10 }}>
          {header}
          <AutoSaveText value={value.text ?? ''} disabled={readOnly} onSave={(text) => set({ ...value, text })} placeholder={t('step.notePlaceholder')} />
        </Card>
      );
    case 'checklist': {
      const items = checklistItems(field, value);
      const extraIds = new Set((value.extraItems ?? []).map((i) => i.id));
      return (
        <Card style={{ gap: 10 }}>
          {header}
          {completion != null ? <ProgressBar value={completion} color={completion >= 1 ? th.colors.success : th.colors.primary} /> : null}
          {items.map((it) => {
            const checked = !!value.checks?.[it.id];
            return (
              <Row key={it.id}>
                <Pressable disabled={readOnly} onPress={() => set({ ...value, checks: { ...value.checks, [it.id]: !checked } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingVertical: 4 }}>
                  <Icon name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={26} color={checked ? th.colors.success : th.colors.textDim} />
                  <Txt style={{ flex: 1, textDecorationLine: checked ? 'line-through' : 'none', opacity: checked ? 0.7 : 1 }}>{it.label}</Txt>
                </Pressable>
                {extraIds.has(it.id) && !readOnly ? (
                  <IconBtn
                    name="close"
                    size={18}
                    onPress={async () => {
                      if (await confirm(t, t('step.deleteItem'), it.label, { destructive: true })) {
                        const checks = { ...value.checks };
                        delete checks[it.id];
                        set({ ...value, checks, extraItems: (value.extraItems ?? []).filter((x) => x.id !== it.id) });
                      }
                    }}
                  />
                ) : null}
              </Row>
            );
          })}
          {!readOnly ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Field
                  value={newItem}
                  onChangeText={setNewItem}
                  placeholder={t('step.addItemToday')}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (!newItem.trim()) return;
                    set({ ...value, extraItems: [...(value.extraItems ?? []), { id: uid(), label: newItem.trim() }] });
                    setNewItem('');
                  }}
                />
              </View>
              <IconBtn
                name="plus"
                bg={th.colors.primary}
                color={th.colors.onPrimary}
                onPress={() => {
                  if (!newItem.trim()) return;
                  set({ ...value, extraItems: [...(value.extraItems ?? []), { id: uid(), label: newItem.trim() }] });
                  setNewItem('');
                }}
              />
            </Row>
          ) : null}
        </Card>
      );
    }
    case 'number': {
      const n = value.number ?? 0;
      return (
        <Card style={{ gap: 10 }}>
          {header}
          <Row style={{ justifyContent: 'center', direction: 'ltr' }} gap={16}>
            <IconBtn name="minus" size={26} bg={th.colors.surface2} onPress={readOnly ? undefined : () => set({ ...value, number: Math.max(0, n - 1) })} />
            <View style={{ minWidth: 110 }}>
              <Field
                value={value.number != null ? String(value.number) : ''}
                editable={!readOnly}
                keyboardType="decimal-pad"
                placeholder="0"
                style={{ textAlign: 'center', fontSize: 26, fontWeight: '900' }}
                onChangeText={(s) => set({ ...value, number: s.trim() === '' ? null : Number(s.replace(',', '.')) || 0 })}
              />
            </View>
            <IconBtn name="plus" size={26} bg={th.colors.primary} color={th.colors.onPrimary} onPress={readOnly ? undefined : () => set({ ...value, number: n + 1 })} />
          </Row>
          <Txt variant="small" dim center>
            {field.target ? `${n} / ${field.target}` : ''} {field.unit ?? ''}
          </Txt>
          {completion != null ? <ProgressBar value={completion} color={completion >= 1 ? th.colors.success : th.colors.primary} /> : null}
        </Card>
      );
    }
    case 'yesno':
      return (
        <Card style={{ gap: 10 }}>
          {header}
          <Row gap={10}>
            <Btn style={{ flex: 1 }} icon="check" label={t('common.yes')} variant={value.yes === true ? 'primary' : 'secondary'} color={value.yes === true ? th.colors.success : undefined} disabled={readOnly} onPress={() => set({ ...value, yes: value.yes === true ? null : true })} />
            <Btn style={{ flex: 1 }} icon="close" label={t('common.no')} variant={value.yes === false ? 'danger' : 'secondary'} disabled={readOnly} onPress={() => set({ ...value, yes: value.yes === false ? null : false })} />
          </Row>
        </Card>
      );
    case 'photo':
      return (
        <Card style={{ gap: 10 }}>
          {header}
          <Row wrap gap={8}>
            {photos.map((a) => (
              <Thumb key={a.id} a={a} uri={uris.get(a.file)} onPress={() => onOpenAttachment(a)} />
            ))}
            {!readOnly ? (
              <Pressable onPress={onAddPhoto} style={{ width: 92, height: 92, borderRadius: Math.min(th.radius, 14), borderWidth: 2, borderStyle: 'dashed', borderColor: th.colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Icon name="camera-plus-outline" size={28} color={th.colors.primary} />
                <Txt variant="tiny" dim>
                  {t('step.addPhoto')}
                </Txt>
              </Pressable>
            ) : null}
          </Row>
        </Card>
      );
  }
}

export default function StepScreen() {
  const { id, key: rawKey } = useLocalSearchParams<{ id: string; key: string }>();
  const key = decodeURIComponent(rawKey ?? '');
  const plan = usePlan(id);
  const { t, lang, root, updatePlan } = useApp();
  const { width } = useWindowDimensions();
  const [noteSheet, setNoteSheet] = useState<{ note: Note | null; text: string } | null>(null);
  const [viewer, setViewer] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);

  const period = useMemo(() => (plan ? computePeriods(plan).find((p) => p.key === key) : undefined), [plan, key]);
  const record = plan?.records[key];
  const attCount = record?.attachments.length ?? 0;
  const uris = useMemo(() => (root && plan ? attachmentUris(root, plan) : new Map<string, string>()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, plan?.folder, attCount]);
  const theme = getTheme(plan?.themeId);

  if (!plan || !period || !root) {
    return (
      <ThemeProvider theme={theme}>
        <Screen>
          <Header title="" onBack={() => router.back()} />
          <Txt dim center>{t('step.notFound')}</Txt>
        </Screen>
      </ThemeProvider>
    );
  }

  const readOnly = !!plan.finishedAt;
  const fields = fieldsFor(plan, period);

  const updateRecord = (fn: (r: StepRecord) => StepRecord) =>
    updatePlan(plan.id, (p: Plan) => {
      const current = p.records[key] ?? emptyRecord(key, period.start, fieldsFor(p, period));
      return { ...p, records: { ...p.records, [key]: { ...fn(current), updatedAt: nowIso() } } };
    });

  const setValue = (fieldId: string, v: FieldValue) => updateRecord((r) => ({ ...r, values: { ...r.values, [fieldId]: v } }));

  const addFiles = async (files: IncomingFile[], fieldId?: string) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const imported: Attachment[] = [];
      for (const f of files) imported.push(await importAttachment(root, plan, f, fieldId));
      await updateRecord((r) => ({ ...r, attachments: [...r.attachments, ...imported] }));
    } catch (e) {
      notify(t('step.importFailed'), String((e as Error)?.message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const pickMedia = async (fieldId?: string, imagesOnly = false) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: imagesOnly ? ['images'] : ['images', 'videos'], allowsMultipleSelection: true, quality: 0.85, selectionLimit: 20 });
    if (res.canceled) return;
    await addFiles(res.assets.map((a) => ({ uri: a.uri, name: a.fileName, mime: a.mimeType, size: a.fileSize })), fieldId);
  };

  const takePhoto = async (fieldId?: string) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return notify(t('step.cameraDenied'));
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (res.canceled) return;
    await addFiles(res.assets.map((a) => ({ uri: a.uri, name: a.fileName, mime: a.mimeType, size: a.fileSize })), fieldId);
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    await addFiles(res.assets.map((a) => ({ uri: a.uri, name: a.name, mime: a.mimeType, size: a.size })));
  };

  const askPhotoSource = (fieldId: string) =>
    new Promise<void>((resolve) => {
      Alert.alert(t('step.addPhoto'), undefined, [
        { text: t('step.camera'), onPress: () => takePhoto(fieldId).finally(resolve) },
        { text: t('step.addMedia'), onPress: () => pickMedia(fieldId, true).finally(resolve) },
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve() },
      ]);
    });

  const deleteAttachment = async (a: Attachment) => {
    if (!(await confirm(t, t('step.deleteAttachment'), a.originalName, { destructive: true }))) return;
    setViewer(null);
    try {
      deleteAttachmentFile(root, plan, a);
    } catch {}
    await updateRecord((r) => ({ ...r, attachments: r.attachments.filter((x) => x.id !== a.id) }));
  };

  const openAtt = async (a: Attachment) => {
    if (a.kind === 'image') return setViewer(a);
    try {
      await openAttachment(root, plan, a);
    } catch {
      notify(t('step.openFailed'));
    }
  };

  const saveNote = async () => {
    if (!noteSheet) return;
    const text = noteSheet.text.trim();
    if (!text) return setNoteSheet(null);
    if (noteSheet.note) {
      if (!(await confirm(t, t('common.saveChanges')))) return;
      const id = noteSheet.note.id;
      await updateRecord((r) => ({ ...r, notes: r.notes.map((n) => (n.id === id ? { ...n, text, updatedAt: nowIso() } : n)) }));
    } else {
      const now = nowIso();
      await updateRecord((r) => ({ ...r, notes: [...r.notes, { id: uid(), text, createdAt: now, updatedAt: now }] }));
    }
    setNoteSheet(null);
  };

  const deleteNote = async (n: Note) => {
    if (!(await confirm(t, t('step.deleteNote'), undefined, { destructive: true }))) return;
    setNoteSheet(null);
    await updateRecord((r) => ({ ...r, notes: r.notes.filter((x) => x.id !== n.id) }));
  };

  const toggleDone = async () => {
    if (record?.done && !(await confirm(t, t('common.areYouSure')))) return;
    await updateRecord((r) => ({ ...r, done: !r.done }));
  };

  const general = (record?.attachments ?? []).filter((a) => !a.fieldId || !fields.some((f) => f.id === a.fieldId));
  const rangeEnd = period.end ? dateTime(period.end, lang) : '…';

  return (
    <ThemeProvider theme={theme}>
      <Screen>
        <Header
          title={stepTitle(period, lang, t)}
          subtitle={`${t('journey.step', { n: period.index })} · ${t('step.range', { from: dateTime(period.start, lang), to: rangeEnd })}`}
          onBack={() => router.back()}
        />
        {readOnly ? (
          <Card>
            <Txt variant="small" dim>
              {t('step.readOnly')}
            </Txt>
          </Card>
        ) : null}

        {fields.map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            value={record?.values[f.id] ?? {}}
            set={(v) => setValue(f.id, v)}
            readOnly={readOnly}
            photos={(record?.attachments ?? []).filter((a) => a.fieldId === f.id)}
            onAddPhoto={() => askPhotoSource(f.id)}
            onOpenAttachment={openAtt}
            uris={uris}
          />
        ))}

        <Section title={t('step.notes')} right={!readOnly ? <Btn small variant="secondary" icon="plus" label={t('step.addNote')} onPress={() => setNoteSheet({ note: null, text: '' })} /> : null}>
          {(record?.notes ?? []).map((n) => (
            <Card key={n.id} onPress={readOnly ? undefined : () => setNoteSheet({ note: n, text: n.text })} style={{ gap: 6 }}>
              <Txt>{n.text}</Txt>
              <Txt variant="tiny" dim>
                {dateTime(new Date(n.updatedAt), lang)}
              </Txt>
            </Card>
          ))}
        </Section>

        <Section title={t('step.attachments')}>
          {!readOnly ? (
            <Row wrap>
              <Btn small variant="secondary" icon="image-multiple-outline" label={t('step.addMedia')} onPress={() => pickMedia()} disabled={busy} />
              <Btn small variant="secondary" icon="camera-outline" label={t('step.camera')} onPress={() => takePhoto()} disabled={busy} />
              <Btn small variant="secondary" icon="paperclip" label={t('step.addFile')} onPress={pickFile} disabled={busy} />
            </Row>
          ) : null}
          {busy ? <Txt variant="small" dim>{t('common.loading')}</Txt> : null}
          <Row wrap gap={8}>
            {general.map((a) => (
              <Thumb key={a.id} a={a} uri={uris.get(a.file)} onPress={() => openAtt(a)} onLongPress={readOnly ? undefined : () => deleteAttachment(a)} />
            ))}
          </Row>
        </Section>

        {!readOnly ? (
          <Btn icon={record?.done ? 'check-decagram' : 'check-circle-outline'} label={record?.done ? t('step.isDone') : t('step.markDone')} variant={record?.done ? 'primary' : 'secondary'} color={record?.done ? theme.colors.success : undefined} onPress={toggleDone} />
        ) : null}

        <Sheet
          visible={!!noteSheet}
          onClose={() => setNoteSheet(null)}
          title={noteSheet?.note ? t('step.editNote') : t('step.addNote')}
          footer={
            <Row gap={10}>
              {noteSheet?.note ? <Btn variant="danger" icon="trash-can-outline" onPress={() => deleteNote(noteSheet.note!)} /> : null}
              <Btn style={{ flex: 1 }} icon="check" label={t('common.save')} onPress={saveNote} />
            </Row>
          }
        >
          <Field value={noteSheet?.text ?? ''} onChangeText={(text) => setNoteSheet((s) => (s ? { ...s, text } : s))} multiline autoFocus placeholder={t('step.notePlaceholder')} style={{ minHeight: 160 }} />
        </Sheet>

        <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)} statusBarTranslucent>
          <View style={{ flex: 1, backgroundColor: alpha('#000000', 0.95), justifyContent: 'center' }}>
            {viewer ? <Image source={{ uri: uris.get(viewer.file) }} style={{ width, height: '75%' }} contentFit="contain" /> : null}
            <Row style={{ position: 'absolute', top: 48, start: 16, end: 16, justifyContent: 'space-between' }}>
              <IconBtn name="close" color="#fff" onPress={() => setViewer(null)} bg={alpha('#ffffff', 0.15)} />
              <Row>
                <IconBtn name="open-in-new" color="#fff" bg={alpha('#ffffff', 0.15)} onPress={() => viewer && openAttachment(root, plan, viewer).catch(() => notify(t('step.openFailed')))} />
                {!readOnly ? <IconBtn name="trash-can-outline" color="#fff" bg={alpha('#ef4444', 0.6)} onPress={() => viewer && deleteAttachment(viewer)} /> : null}
              </Row>
            </Row>
          </View>
        </Modal>
      </Screen>
    </ThemeProvider>
  );
}
