import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ARABIC_FONT, alpha, useDir, useTheme } from './theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color, style }: { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <MaterialCommunityIcons name={name as IconName} size={size} color={color ?? theme.colors.text} style={style} />;
}

/** Icons that point "forward/back" must mirror in RTL. */
export function useDirIcon(ltr: string, rtl: string): string {
  return useDir().rtl ? rtl : ltr;
}

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'tiny';

export function Txt({
  children,
  variant = 'body',
  color,
  dim,
  center,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: Variant;
  color?: string;
  dim?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const th = useTheme();
  const heading = variant === 'display' || variant === 'h1' || variant === 'h2' || variant === 'h3';
  const base: TextStyle = {
    color: color ?? (dim ? th.colors.textDim : th.colors.text),
    fontFamily: heading ? th.font.heading : th.font.body,
    ...(heading
      ? {
          fontWeight: th.headingWeight,
          fontStyle: th.headingItalic ? 'italic' : 'normal',
          letterSpacing: th.letterSpacing,
          textTransform: th.uppercase && variant !== 'h3' ? 'uppercase' : 'none',
        }
      : {}),
    ...(center ? { textAlign: 'center' } : {}),
    // Cairo's Arabic marks sit above and below the Latin line box; give them room.
    ...(th.font.body === ARABIC_FONT ? { lineHeight: Math.round((styles[variant].fontSize ?? 16) * 1.65) } : {}),
  };
  return (
    <Text numberOfLines={numberOfLines} style={[styles[variant], base, style]}>
      {children}
    </Text>
  );
}

export function Btn({
  label,
  icon,
  onPress,
  variant = 'primary',
  small,
  disabled,
  style,
  color,
}: {
  label?: string;
  icon?: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  const th = useTheme();
  const c = th.colors;
  const bg =
    variant === 'primary' ? color ?? c.primary : variant === 'danger' ? c.danger : variant === 'secondary' ? c.surface2 : 'transparent';
  const fg = variant === 'primary' ? c.onPrimary : variant === 'danger' ? '#fff' : color ?? c.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: small ? 8 : 14,
          paddingHorizontal: small ? 12 : 18,
          borderRadius: th.radius,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' ? th.borderWidth : 0,
          borderColor: c.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} /> : null}
      {label ? (
        <Text
          style={{
            color: fg,
            fontWeight: '700',
            fontSize: small ? 14 : 16,
            fontFamily: th.font.body,
            letterSpacing: th.uppercase ? 0.5 : 0,
          }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function IconBtn({ name, onPress, size = 22, color, bg, style, label }: { name: string; onPress?: () => void; size?: number; color?: string; bg?: string; style?: StyleProp<ViewStyle>; label?: string }) {
  const th = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? name}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        { width: size + 18, height: size + 18, borderRadius: (size + 18) / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg ?? 'transparent', opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <Icon name={name} size={size} color={color ?? th.colors.text} />
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const th = useTheme();
  const s: ViewStyle = {
    backgroundColor: th.colors.surface,
    borderRadius: th.radius,
    borderWidth: th.borderWidth,
    borderColor: th.colors.border,
    padding: 16,
  };
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s, { opacity: pressed ? 0.85 : 1 }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[s, style]}>{children}</View>;
}

export function Field({
  label,
  hint,
  style,
  ...props
}: TextInputProps & { label?: string; hint?: string }) {
  const th = useTheme();
  const { rtl } = useDir();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt variant="label" dim>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={alpha(th.colors.textDim, 0.7)}
        {...props}
        style={[
          {
            color: th.colors.text,
            backgroundColor: th.colors.surface2,
            borderRadius: Math.min(th.radius, 14),
            borderWidth: th.borderWidth,
            borderColor: th.colors.border,
            paddingHorizontal: 14,
            paddingVertical: props.multiline ? 12 : 10,
            fontSize: 16,
            minHeight: props.multiline ? 90 : 46,
            textAlignVertical: props.multiline ? 'top' : 'center',
            fontFamily: th.font.body,
            // TextInput alignment is not mirrored automatically.
            textAlign: rtl ? 'right' : 'left',
            writingDirection: rtl ? 'rtl' : 'ltr',
          },
          style,
        ]}
      />
      {hint ? <Txt variant="tiny" dim>{hint}</Txt> : null}
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: V; label?: string; icon?: string; color?: string }[];
  value: V;
  onChange: (v: V) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const th = useTheme();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: th.colors.surface2, borderRadius: th.radius, padding: 4, gap: 4, borderWidth: th.borderWidth, borderColor: th.colors.border }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        const fg = active ? th.colors.onPrimary : o.color ?? th.colors.text;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              flexDirection: 'row',
              gap: 4,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 9,
              paddingHorizontal: 4,
              borderRadius: Math.max(th.radius - 4, 2),
              backgroundColor: active ? o.color ?? th.colors.primary : 'transparent',
            }}
          >
            {o.icon ? <Icon name={o.icon} size={16} color={fg} /> : null}
            {o.label ? (
              <Text numberOfLines={1} style={{ color: fg, fontWeight: '700', fontSize: 13, fontFamily: th.font.body }}>
                {o.label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, icon, active, onPress, color }: { label: string; icon?: string; active?: boolean; onPress?: () => void; color?: string }) {
  const th = useTheme();
  const c = color ?? th.colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: active ? c : th.colors.border,
        backgroundColor: active ? alpha(c, 0.18) : th.colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={16} color={active ? c : th.colors.textDim} /> : null}
      <Text style={{ color: active ? c : th.colors.text, fontWeight: '600', fontSize: 13, fontFamily: th.font.body }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, gap = 8, style, wrap }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h3">{title}</Txt>
        {right}
      </Row>
      {children}
    </View>
  );
}

export function ProgressBar({ value, color, height = 6 }: { value: number; color?: string; height?: number }) {
  const th = useTheme();
  return (
    <View style={{ height, borderRadius: height, backgroundColor: th.colors.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height, backgroundColor: color ?? th.colors.primary, borderRadius: height }} />
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const th = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <View
        style={{
          width: 46,
          height: 28,
          borderRadius: 14,
          padding: 3,
          backgroundColor: value ? th.colors.primary : th.colors.surface2,
          borderWidth: 1,
          borderColor: th.colors.border,
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: value ? th.colors.onPrimary : th.colors.textDim }} />
      </View>
      <Txt style={{ flex: 1 }}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 40 },
  h1: { fontSize: 26, lineHeight: 32 },
  h2: { fontSize: 20, lineHeight: 26 },
  h3: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 14, lineHeight: 19 },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  tiny: { fontSize: 11, lineHeight: 14 },
});
