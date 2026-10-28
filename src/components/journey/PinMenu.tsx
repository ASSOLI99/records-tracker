import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useApp } from '@/state/app';
import { Icon } from '@/ui/kit';
import { alpha, useTheme } from '@/ui/theme';

export interface PinAction {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
}

/** Bottom-end pin button that fans out the plan's edit actions. */
export function PinMenu({ actions, bottom }: { actions: PinAction[]; bottom: number }) {
  const th = useTheme();
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(anim, { toValue: open ? 1 : 0, useNativeDriver: true, friction: 7 }).start();
  }, [open, anim]);

  return (
    <>
      {open ? <Pressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: alpha('#000000', 0.25) }} onPress={() => setOpen(false)} /> : null}
      <View pointerEvents="box-none" style={{ position: 'absolute', end: 16, bottom, alignItems: 'flex-end', gap: 12 }}>
        {actions.map((a, i) => (
          <Animated.View
            key={a.key}
            pointerEvents={open ? 'auto' : 'none'}
            style={{
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20 * (actions.length - i), 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            }}
          >
            <Pressable
              onPress={() => {
                setOpen(false);
                a.onPress();
              }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.75 : 1 })}
            >
              <View style={{ backgroundColor: th.colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: th.borderWidth, borderColor: th.colors.border }}>
                <Text style={{ color: th.colors.text, fontWeight: '700', fontFamily: th.font.body }}>{a.label}</Text>
              </View>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: th.colors.surface2, borderWidth: th.borderWidth, borderColor: th.colors.border, alignItems: 'center', justifyContent: 'center', marginEnd: 4 }}>
                <Icon name={a.icon} color={th.colors.primary} />
              </View>
            </Pressable>
          </Animated.View>
        ))}
        <Pressable
          accessibilityLabel={open ? t('common.close') : 'menu'}
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => ({
            width: 60,
            height: 60,
            borderRadius: th.node === 'circle' || th.node === 'leaf' ? 30 : th.radius + 4,
            backgroundColor: th.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            elevation: 8,
            shadowColor: th.glow ? th.colors.primary : '#000',
            shadowOpacity: 0.4,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          })}
        >
          <Animated.View style={{ transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }}>
            <Icon name={open ? 'plus' : 'pin'} size={28} color={th.colors.onPrimary} />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}
