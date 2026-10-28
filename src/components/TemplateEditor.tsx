import { Pressable, View } from 'react-native';
import type { FieldType, TemplateField } from '@/model/types';
import { uid } from '@/model/util';
import { MOOD_COLORS } from '@/model/presets';
import { useApp } from '@/state/app';
import { Card, Chip, Field, Icon, IconBtn, Row, Txt } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export const FIELD_ICONS: Record<FieldType, string> = {
  mood: 'emoticon-outline',
  text: 'text-long',
  checklist: 'format-list-checks',
  number: 'numeric',
  yesno: 'toggle-switch-outline',
  photo: 'camera-outline',
};

const PALETTE = [MOOD_COLORS.red, MOOD_COLORS.yellow, MOOD_COLORS.green, '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#64748b'];

function newField(type: FieldType, label: string): TemplateField {
  switch (type) {
    case 'mood':
      return {
        id: uid(),
        type,
        label,
        moodOptions: [
          { id: uid(), label: '😞', color: MOOD_COLORS.red },
          { id: uid(), label: '😐', color: MOOD_COLORS.yellow },
          { id: uid(), label: '😄', color: MOOD_COLORS.green },
        ],
      };
    case 'checklist':
      return { id: uid(), type, label, items: [{ id: uid(), label: '' }] };
    case 'number':
      return { id: uid(), type, label, unit: '', target: undefined };
    default:
      return { id: uid(), type, label };
  }
}

function FieldCard({ field, onChange, onMove, onDelete, first, last }: { field: TemplateField; onChange: (f: TemplateField) => void; onMove: (d: -1 | 1) => void; onDelete: () => void; first: boolean; last: boolean }) {
  const th = useTheme();
  const { t } = useApp();
  return (
    <Card style={{ gap: 12 }}>
      <Row>
        <Icon name={FIELD_ICONS[field.type]} color={th.colors.primary} />
        <Txt variant="label" style={{ flex: 1 }}>
          {t(`template.type.${field.type}` as 'template.type.mood')}
        </Txt>
        <IconBtn name="arrow-up" size={18} onPress={() => onMove(-1)} style={{ opacity: first ? 0.3 : 1 }} />
        <IconBtn name="arrow-down" size={18} onPress={() => onMove(1)} style={{ opacity: last ? 0.3 : 1 }} />
        <IconBtn name="trash-can-outline" size={18} color={th.colors.danger} onPress={onDelete} />
      </Row>
      <Field placeholder={t('template.field.label')} value={field.label} onChangeText={(label) => onChange({ ...field, label })} />

      {field.type === 'mood' ? (
        <View style={{ gap: 8 }}>
          <Txt variant="label" dim>{t('template.mood.options')}</Txt>
          {(field.moodOptions ?? []).map((o, i) => (
            <Row key={o.id}>
              <Pressable
                accessibilityLabel="colour"
                onPress={() => {
                  const next = PALETTE[(PALETTE.indexOf(o.color) + 1) % PALETTE.length];
                  onChange({ ...field, moodOptions: field.moodOptions!.map((x, j) => (j === i ? { ...x, color: next } : x)) });
                }}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: o.color, borderWidth: 2, borderColor: th.colors.border }}
              />
              <View style={{ flex: 1 }}>
                <Field value={o.label} onChangeText={(label) => onChange({ ...field, moodOptions: field.moodOptions!.map((x, j) => (j === i ? { ...x, label } : x)) })} />
              </View>
              {(field.moodOptions ?? []).length > 2 ? (
                <IconBtn name="close" size={18} onPress={() => onChange({ ...field, moodOptions: field.moodOptions!.filter((_, j) => j !== i) })} />
              ) : null}
            </Row>
          ))}
          {(field.moodOptions ?? []).length < 6 ? (
            <Chip
              icon="plus"
              label={t('template.mood.addOption')}
              onPress={() => onChange({ ...field, moodOptions: [...(field.moodOptions ?? []), { id: uid(), label: '', color: PALETTE[(field.moodOptions ?? []).length % PALETTE.length] }] })}
            />
          ) : null}
        </View>
      ) : null}

      {field.type === 'checklist' ? (
        <View style={{ gap: 8 }}>
          <Txt variant="label" dim>{t('template.checklist.items')}</Txt>
          {(field.items ?? []).map((it, i) => (
            <Row key={it.id}>
              <Icon name="checkbox-blank-outline" color={th.colors.textDim} />
              <View style={{ flex: 1 }}>
                <Field value={it.label} onChangeText={(label) => onChange({ ...field, items: field.items!.map((x, j) => (j === i ? { ...x, label } : x)) })} />
              </View>
              <IconBtn name="close" size={18} onPress={() => onChange({ ...field, items: field.items!.filter((_, j) => j !== i) })} />
            </Row>
          ))}
          <Chip icon="plus" label={t('template.checklist.addItem')} onPress={() => onChange({ ...field, items: [...(field.items ?? []), { id: uid(), label: '' }] })} />
        </View>
      ) : null}

      {field.type === 'number' ? (
        <Row gap={10}>
          <View style={{ flex: 1 }}>
            <Field label={t('template.number.target')} keyboardType="decimal-pad" value={field.target != null ? String(field.target) : ''} onChangeText={(s) => onChange({ ...field, target: s.trim() === '' ? undefined : Number(s.replace(',', '.')) || 0 })} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('template.number.unit')} value={field.unit ?? ''} onChangeText={(unit) => onChange({ ...field, unit })} />
          </View>
        </Row>
      ) : null}
    </Card>
  );
}

/** Removes empty items/options so a half-typed row isn't saved. */
export function cleanFields(fields: TemplateField[]): TemplateField[] {
  return fields.map((f) => ({
    ...f,
    label: f.label.trim(),
    items: f.items?.filter((i) => i.label.trim()).map((i) => ({ ...i, label: i.label.trim() })),
    moodOptions: f.moodOptions?.map((o) => ({ ...o, label: o.label.trim() || '•' })),
  }));
}

export function TemplateEditor({ fields, onChange }: { fields: TemplateField[]; onChange: (f: TemplateField[]) => void }) {
  const { t } = useApp();
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <View style={{ gap: 12 }}>
      {fields.length === 0 ? <Txt dim>{t('template.empty')}</Txt> : null}
      {fields.map((f, i) => (
        <FieldCard
          key={f.id}
          field={f}
          first={i === 0}
          last={i === fields.length - 1}
          onChange={(nf) => onChange(fields.map((x) => (x.id === f.id ? nf : x)))}
          onMove={(d) => move(i, d)}
          onDelete={() => onChange(fields.filter((x) => x.id !== f.id))}
        />
      ))}
      <Txt variant="label" dim>{t('template.addField')}</Txt>
      <Row wrap>
        {(Object.keys(FIELD_ICONS) as FieldType[]).map((type) => (
          <Chip key={type} icon={FIELD_ICONS[type]} label={t(`template.type.${type}` as 'template.type.mood')} onPress={() => onChange([...fields, newField(type, t(`template.type.${type}` as 'template.type.mood'))])} />
        ))}
      </Row>
    </View>
  );
}
