import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ServerProvider, useServer } from '@/store/server';
import { useAppTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ServerProvider>
        <RootNavigator />
      </ServerProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { ready } = useServer();
  const { colors, isDark } = useAppTheme();

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  if (!ready) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="flat/[number]/index" options={{ title: '' }} />
        <Stack.Screen name="flat/[number]/room/[index]" options={{ title: '' }} />
      </Stack>
    </ThemeProvider>
  );
}
