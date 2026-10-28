import { Text, View } from 'react-native';
import type { StepSummary } from '@/model/progress';
import { Icon } from '@/ui/kit';
import { alpha, useTheme } from '@/ui/theme';

/**
 * Status at a glance without opening a step: mood colour dot, the first two completion
 * percentages (… if more), a text icon if anything was written, and media/file icons.
 */
export function StepBadges({ summary, compact }: { summary: StepSummary; compact?: boolean }) {
  const th = useTheme();
  const items: React.ReactNode[] = [];
  const size = compact ? 12 : 14;
  if (summary.moodColor) {
    items.push(<View key="mood" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: summary.moodColor, borderWidth: 1.5, borderColor: alpha('#ffffff', 0.8) }} />);
  }
  const shown = summary.percents.slice(0, 2);
  shown.forEach((p, i) => {
    const color = p >= 100 ? th.colors.success : p >= 50 ? th.colors.warning : th.colors.textDim;
    items.push(
      <Text key={`p${i}`} style={{ color, fontSize: compact ? 10 : 11, fontWeight: '800', fontFamily: th.font.body }}>
        {p}%{i === shown.length - 1 && summary.percents.length > 2 ? '…' : ''}
      </Text>,
    );
  });
  if (summary.hasText) items.push(<Icon key="txt" name="text" size={size} color={th.colors.textDim} />);
  if (summary.images) items.push(<Icon key="img" name="image-outline" size={size} color={th.colors.textDim} />);
  if (summary.videos) items.push(<Icon key="vid" name="video-outline" size={size} color={th.colors.textDim} />);
  if (summary.files) items.push(<Icon key="file" name="paperclip" size={size} color={th.colors.textDim} />);
  if (!items.length) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: alpha(th.colors.surface, 0.92),
        borderWidth: 1,
        borderColor: th.colors.border,
        alignSelf: 'flex-start',
      }}
    >
      {items}
    </View>
  );
}
