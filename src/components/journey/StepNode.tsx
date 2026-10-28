import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import type { StepSummary } from '@/model/progress';
import { Icon } from '@/ui/kit';
import { alpha, useTheme } from '@/ui/theme';
import { NodeShape } from '../NodeShape';

export type NodeState = 'current' | 'done' | 'active' | 'missed';

export function nodeState(summary: StepSummary, current: boolean): NodeState {
  if (current) return 'current';
  if (summary.done) return 'done';
  if (summary.active) return 'active';
  return 'missed';
}

/** A step on the map: themed shape, state colours, and a pulse on the current step. */
export function StepNode({ index, state, size = 62 }: { index: number; state: NodeState; size?: number }) {
  const th = useTheme();
  const c = th.colors;
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (state !== 'current') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const fill = state === 'done' ? c.primary : state === 'active' ? alpha(c.primary, 0.55) : state === 'current' ? c.surface : c.missed;
  const stroke = state === 'current' ? c.accent : state === 'missed' ? alpha(c.text, 0.12) : alpha(c.text, 0.22);
  const fg = state === 'done' ? c.onPrimary : state === 'current' ? c.accent : state === 'active' ? c.onPrimary : c.textDim;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {state === 'current' ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor: c.accent,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
          }}
        />
      ) : null}
      <NodeShape shape={th.node} size={size} fill={fill} stroke={stroke} strokeWidth={Math.max(2, th.borderWidth + 1)} glow={th.glow && (state === 'current' || state === 'done') ? (state === 'current' ? c.accent : c.primary) : null}>
        {state === 'done' ? (
          <Icon name={th.id === 'arcade' ? 'star' : 'check-bold'} size={size * 0.42} color={fg} />
        ) : state === 'current' ? (
          <Icon name={th.streakIcon} size={size * 0.42} color={fg} />
        ) : (
          <Text style={{ color: fg, fontWeight: '900', fontSize: size * 0.3, fontFamily: th.font.heading }}>{index}</Text>
        )}
      </NodeShape>
    </View>
  );
}
