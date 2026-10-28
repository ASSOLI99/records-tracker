import { Stack } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/state/app';
import { useDir } from '@/ui/theme';

function Navigator() {
  const { rtl, direction } = useDir();
  return (
    <View style={{ flex: 1, direction }}>
      {/* Screens push in from the reading direction's end. */}
      <Stack screenOptions={{ headerShown: false, animation: rtl ? 'slide_from_left' : 'slide_from_right' }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Navigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
