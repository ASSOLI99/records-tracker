import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { useApp } from '@/state/app';
import { THEMES, type Theme } from '@/themes/themes';
import { Icon, Row } from '@/ui/kit';
import { alpha, localizeTheme } from '@/ui/theme';
import { NodeShape } from './NodeShape';

export function ThemePreview({ theme: base, selected, onPress }: { theme: Theme; selected?: boolean; onPress?: () => void }) {
  const { lang } = useApp();
  const theme = localizeTheme(base, lang);
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <LinearGradient
        colors={[c.bg, c.bg2]}
        style={{
          borderRadius: Math.max(theme.radius, 10),
          borderWidth: selected ? 3 : theme.borderWidth,
          borderColor: selected ? c.primary : c.border,
          padding: 14,
          gap: 10,
          overflow: 'hidden',
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={8} style={{ flex: 1 }}>
            <Icon name={theme.heroIcon} size={22} color={c.primary} />
            <Text
              numberOfLines={1}
              style={{
                color: c.text,
                fontFamily: theme.font.heading,
                fontWeight: theme.headingWeight,
                fontStyle: theme.headingItalic ? 'italic' : 'normal',
                textTransform: theme.uppercase ? 'uppercase' : 'none',
                letterSpacing: theme.letterSpacing,
                fontSize: 17,
                flexShrink: 1,
              }}
            >
              {theme.name[lang]}
            </Text>
          </Row>
          {selected ? <Icon name="check-circle" size={22} color={c.primary} /> : null}
        </Row>
        <Text style={{ color: c.textDim, fontFamily: theme.font.body, fontSize: 13 }}>{theme.tagline[lang]}</Text>
        <Row gap={14} style={{ direction: 'ltr' }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ marginTop: i % 2 ? 10 : 0 }}>
              <NodeShape
                shape={theme.node}
                size={34}
                fill={i < 2 ? c.primary : i === 2 ? c.surface : c.missed}
                stroke={i === 2 ? c.accent : alpha(c.text, 0.25)}
                strokeWidth={Math.max(2, theme.borderWidth)}
                glow={theme.glow && i === 2 ? c.accent : null}
              >
                <Icon name={i < 2 ? 'check' : i === 2 ? theme.streakIcon : 'lock'} size={16} color={i < 2 ? c.onPrimary : i === 2 ? c.accent : c.textDim} />
              </NodeShape>
            </View>
          ))}
          <Icon name={theme.finishIcon} size={28} color={c.accent} />
        </Row>
      </LinearGradient>
    </Pressable>
  );
}

export function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <View style={{ gap: 12 }}>
      {THEMES.map((th) => (
        <ThemePreview key={th.id} theme={th} selected={th.id === value} onPress={() => onChange(th.id)} />
      ))}
    </View>
  );
}
