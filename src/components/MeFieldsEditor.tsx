import { View } from 'react-native';
import type { MeField } from '@/model/types';
import { uid } from '@/model/util';
import { useApp } from '@/state/app';
import { Btn, Card, Field, IconBtn, Row } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export function MeFieldsEditor({ fields, onChange }: { fields: MeField[]; onChange: (f: MeField[]) => void }) {
  const th = useTheme();
  const { t } = useApp();
  return (
    <View style={{ gap: 10 }}>
      {fields.map((f, i) => (
        <Card key={f.id} style={{ gap: 8, padding: 12 }}>
          <Row>
            <View style={{ flex: 1 }}>
              <Field placeholder={t('me.fieldLabel')} value={f.label} onChangeText={(label) => onChange(fields.map((x, j) => (j === i ? { ...x, label } : x)))} />
            </View>
            <IconBtn name="trash-can-outline" color={th.colors.danger} onPress={() => onChange(fields.filter((_, j) => j !== i))} />
          </Row>
          <Field placeholder={t('me.fieldValue')} value={f.value} onChangeText={(value) => onChange(fields.map((x, j) => (j === i ? { ...x, value } : x)))} />
        </Card>
      ))}
      <Btn variant="secondary" icon="plus" label={t('me.addField')} onPress={() => onChange([...fields, { id: uid(), label: '', value: '' }])} />
    </View>
  );
}
