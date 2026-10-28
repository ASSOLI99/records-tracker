import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TFn } from '@/i18n';
import { IconBtn, Row, Txt, useDirIcon } from './kit';
import { alpha, useDir, useTheme } from './theme';

/** Themed full-screen background with safe-area padding. */
export function Screen({ children, scroll = true, style, padded = true }: { children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const th = useTheme();
  const { direction } = useDir();
  const insets = useSafeAreaInsets();
  const content: ViewStyle = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: padded ? 18 : 0, gap: 18 };
  return (
    <LinearGradient colors={[th.colors.bg, th.colors.bg2]} style={{ flex: 1, direction }}>
      <StatusBar style={th.dark ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView contentContainerStyle={[content, style]} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, content, style]}>{children}</View>
        )}
      </KeyboardAvoidingView>
      {/* Keeps scrolled content from running under the status bar icons. */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: alpha(th.colors.bg, 0.92) }} />
    </LinearGradient>
  );
}

export function Header({ title, onBack, right, subtitle }: { title: string; onBack?: () => void; right?: ReactNode; subtitle?: string }) {
  const backIcon = useDirIcon('arrow-left', 'arrow-right');
  return (
    <Row style={{ justifyContent: 'space-between' }} gap={6}>
      {onBack ? <IconBtn name={backIcon} onPress={onBack} label="back" /> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="h2" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="small" dim numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </Row>
  );
}

/** Bottom sheet modal with a title bar. Pass scroll={false} when the content is its own list. */
export function Sheet({ visible, onClose, title, children, footer, scroll = true }: { visible: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; scroll?: boolean }) {
  const th = useTheme();
  const { direction } = useDir();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* A modal is its own native root, so it needs the direction set again. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, direction }}>
        <Pressable style={{ flex: 1, backgroundColor: alpha('#000000', 0.45) }} onPress={onClose} />
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: th.colors.surface,
            borderTopLeftRadius: Math.max(th.radius, 12) + 6,
            borderTopRightRadius: Math.max(th.radius, 12) + 6,
            borderWidth: th.borderWidth,
            borderColor: th.colors.border,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: th.colors.border }} />
          </View>
          <Row style={{ paddingHorizontal: 18, paddingTop: 6, justifyContent: 'space-between' }}>
            <Txt variant="h2" style={{ flex: 1 }} numberOfLines={1}>
              {title}
            </Txt>
            <IconBtn name="close" onPress={onClose} label="close" />
          </Row>
          {scroll ? (
            <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={{ padding: 18, gap: 16, flexShrink: 1 }}>{children}</View>
          )}
          {footer ? <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Native "are you sure" dialog. Resolves true on confirm. */
export function confirm(t: TFn, title: string, message?: string, opts: { destructive?: boolean; ok?: string; cancel?: string } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: opts.cancel ?? t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: opts.ok ?? (opts.destructive ? t('common.delete') : t('common.yes')), style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string) {
  Alert.alert(title, message);
}
