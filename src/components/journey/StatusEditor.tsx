import { useState } from 'react';
import { View } from 'react-native';
import type { Status, StatusDirection } from '@/model/types';
import { MAIN_STATUSES, statusReached } from '@/model/progress';
import { dateTime } from '@/model/labels';
import { nowIso, uid } from '@/model/util';
import { useApp } from '@/state/app';
import { Btn, Card, Field, Icon, Row, Segmented, Toggle, Txt } from '@/ui/kit';
import { Sheet, confirm, notify } from '@/ui/overlays';
import { IconPicker } from '@/ui/pickers';
import { useTheme } from '@/ui/theme';

export interface StatusSave {
  status: Status;
  /** Set when the current value changed and the user chose to put it on the journey. */
  markFrom?: string;
}

function blank(main: boolean): Status {
  const now = nowIso();
  return { id: uid(), name: '', icon: null, kind: 'number', current: '', target: '', direction: 'lower', unit: '', main, history: [], createdAt: now, updatedAt: now };
}

/** Remount with a new `key` per opening: the draft is taken from `status` on mount. */
export function StatusEditor({
  visible,
  status,
  all,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  status: Status | null;
  all: Status[];
  onClose: () => void;
  onSave: (s: StatusSave) => void;
  onDelete: (s: Status) => void;
}) {
  const th = useTheme();
  const { t, lang } = useApp();
  const mainCount = all.filter((s) => s.main && s.id !== status?.id).length;
  const [draft, setDraft] = useState<Status>(() => status ?? blank(mainCount < MAIN_STATUSES));
  const [iconOpen, setIconOpen] = useState(false);

  const set = (patch: Partial<Status>) => setDraft((d) => ({ ...d, ...patch }));
  const isNew = !status;

  const save = async () => {
    const d = { ...draft, name: draft.name.trim(), current: draft.current.trim(), target: draft.target.trim(), unit: draft.unit?.trim() };
    if (!d.name && !d.icon) return notify(t('status.needName'));
    if (d.kind === 'text') d.direction = 'match';
    if (!isNew && !(await confirm(t, t('status.updateConfirm')))) return;
    let markFrom: string | undefined;
    const changed = !isNew && status!.current !== d.current;
    if (changed) {
      d.history = [...d.history, { at: nowIso(), from: status!.current, to: d.current }];
      const mark = await confirm(t, t('status.markTitle'), t('status.markBody', { name: d.name || '•', from: status!.current || '—', to: d.current || '—' }), { ok: t('common.yes'), cancel: t('common.no') });
      if (mark) markFrom = status!.current;
    }
    d.updatedAt = nowIso();
    onSave({ status: d, markFrom });
  };

  const remove = async () => {
    if (!status) return;
    if (await confirm(t, t('common.areYouSure'), t('common.deleteConfirm', { name: status.name || '•' }), { destructive: true })) onDelete(status);
  };

  const dirOptions: { value: StatusDirection; label: string; icon: string }[] = [
    { value: 'lower', label: t('status.dir.lower'), icon: 'arrow-down-thin' },
    { value: 'higher', label: t('status.dir.higher'), icon: 'arrow-up-thin' },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isNew ? t('status.new') : t('status.edit')}
      footer={
        <Row gap={10}>
          {!isNew ? <Btn variant="danger" icon="trash-can-outline" onPress={remove} /> : null}
          <Btn style={{ flex: 1 }} label={t('common.save')} icon="check" onPress={save} />
        </Row>
      }
    >
      <Row gap={10}>
        <Card onPress={() => setIconOpen(true)} style={{ width: 64, height: 64, padding: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={draft.icon || 'shape-plus'} size={30} color={draft.icon ? th.colors.primary : th.colors.textDim} />
        </Card>
        <View style={{ flex: 1 }}>
          <Field label={t('status.name')} value={draft.name} onChangeText={(name) => set({ name })} placeholder={t('status.namePlaceholder')} maxLength={30} />
        </View>
      </Row>
      <Segmented
        value={draft.kind}
        onChange={(kind) => set({ kind, direction: kind === 'text' ? 'match' : draft.direction === 'match' ? 'lower' : draft.direction })}
        options={[
          { value: 'number', label: t('status.kind.number'), icon: 'numeric' },
          { value: 'text', label: t('status.kind.text'), icon: 'format-text' },
        ]}
      />
      <Row gap={10}>
        <View style={{ flex: 1 }}>
          <Field label={t('status.current')} value={draft.current} onChangeText={(current) => set({ current })} keyboardType={draft.kind === 'number' ? 'decimal-pad' : 'default'} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label={t('status.target')} value={draft.target} onChangeText={(target) => set({ target })} keyboardType={draft.kind === 'number' ? 'decimal-pad' : 'default'} />
        </View>
        {draft.kind === 'number' ? (
          <View style={{ width: 80 }}>
            <Field label={t('status.unit')} value={draft.unit ?? ''} onChangeText={(unit) => set({ unit })} maxLength={8} />
          </View>
        ) : null}
      </Row>
      {draft.kind === 'number' ? (
        <View style={{ gap: 6 }}>
          <Txt variant="label" dim>{t('status.direction')}</Txt>
          <Segmented value={draft.direction} onChange={(direction) => set({ direction })} options={dirOptions} />
        </View>
      ) : (
        <Row>
          <Icon name="equal" color={th.colors.textDim} />
          <Txt variant="small" dim>
            {t('status.direction')}: {t('status.dir.match')}
          </Txt>
        </Row>
      )}
      {statusReached(draft) ? (
        <Row>
          <Icon name="check-decagram" color={th.colors.success} />
          <Txt color={th.colors.success} style={{ fontWeight: '700' }}>
            {t('status.reached')}
          </Txt>
        </Row>
      ) : null}
      <Toggle
        value={draft.main}
        label={t('status.main')}
        onChange={(main) => {
          if (main && mainCount >= MAIN_STATUSES) return notify(t('status.mainFull'));
          set({ main });
        }}
      />
      {draft.history.length ? (
        <View style={{ gap: 6 }}>
          <Txt variant="label" dim>{t('status.history')}</Txt>
          {[...draft.history]
            .reverse()
            .slice(0, 12)
            .map((h, i) => (
              <Row key={i} style={{ justifyContent: 'space-between' }}>
                <Txt variant="small">
                  {h.from || '—'} → {h.to || '—'}
                </Txt>
                <Txt variant="tiny" dim>
                  {dateTime(new Date(h.at), lang)}
                </Txt>
              </Row>
            ))}
        </View>
      ) : null}
      <IconPicker
        visible={iconOpen}
        value={draft.icon}
        onClose={() => setIconOpen(false)}
        onPick={(icon) => {
          set({ icon });
          setIconOpen(false);
        }}
      />
    </Sheet>
  );
}
