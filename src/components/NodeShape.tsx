import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { NodeShape as Shape } from '@/themes/themes';

/** A journey node in the theme's shape, with content centred on top. */
export function NodeShape({
  shape,
  size,
  fill,
  stroke,
  strokeWidth = 3,
  children,
  glow,
}: {
  shape: Shape;
  size: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  children?: ReactNode;
  glow?: string | null;
}) {
  const shadow: ViewStyle = glow
    ? { shadowColor: glow, shadowOpacity: 0.9, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 10 }
    : { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 };
  const center: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' };

  if (shape === 'hex') {
    const s = size;
    const pts = [
      [s * 0.5, strokeWidth / 2],
      [s - strokeWidth / 2, s * 0.25],
      [s - strokeWidth / 2, s * 0.75],
      [s * 0.5, s - strokeWidth / 2],
      [strokeWidth / 2, s * 0.75],
      [strokeWidth / 2, s * 0.25],
    ]
      .map((p) => p.join(','))
      .join(' ');
    return (
      <View style={[{ width: s, height: s }, shadow]}>
        <Svg width={s} height={s}>
          <Polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        </Svg>
        <View style={center}>{children}</View>
      </View>
    );
  }

  if (shape === 'diamond') {
    const inner = size * 0.74;
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
        <View
          style={[
            { width: inner, height: inner, backgroundColor: fill, borderColor: stroke, borderWidth: strokeWidth, borderRadius: 6, transform: [{ rotate: '45deg' }] },
            shadow,
          ]}
        />
        <View style={center}>{children}</View>
      </View>
    );
  }

  const r = size / 2;
  const radii: Record<Exclude<Shape, 'hex' | 'diamond'>, ViewStyle> = {
    circle: { borderRadius: r },
    square: { borderRadius: size * 0.22 },
    shield: { borderTopLeftRadius: size * 0.18, borderTopRightRadius: size * 0.18, borderBottomLeftRadius: r, borderBottomRightRadius: r },
    leaf: { borderTopLeftRadius: r, borderBottomRightRadius: r, borderTopRightRadius: size * 0.12, borderBottomLeftRadius: size * 0.12 },
  };
  return (
    <View
      style={[
        { width: size, height: size, backgroundColor: fill, borderColor: stroke, borderWidth: strokeWidth, alignItems: 'center', justifyContent: 'center' },
        radii[shape],
        shadow,
      ]}
    >
      {children}
    </View>
  );
}
