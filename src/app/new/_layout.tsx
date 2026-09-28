import { router, Stack } from 'expo-router';

import { IconButton } from '@/components/ui';
import { DraftProvider } from '@/store/draft';
import { useAppTheme } from '@/theme';

export default function NewProjectLayout() {
  const { colors } = useAppTheme();

  return (
    <DraftProvider>
      <Stack
        screenOptions={{
          title: 'New project',
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          contentStyle: { backgroundColor: colors.background },
          headerRight: () => <IconButton plain icon="close" accessibilityLabel="Close" size={22} onPress={() => router.dismissTo('/')} />,
        }}
      />
    </DraftProvider>
  );
}
