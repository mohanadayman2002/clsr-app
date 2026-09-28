import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import type { IconName } from '@/lib/catalog';
import { useSettings } from '@/store/settings';
import { radius, spacing, useAppTheme } from '@/theme';

const SLIDES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'map-outline',
    title: 'Start with a floor plan',
    body: 'Snap a photo, pick an image or import a PDF of any 2D apartment layout.',
  },
  {
    icon: 'color-palette-outline',
    title: 'Choose your style',
    body: 'Tell CLSR how you like to live — style, budget and the rooms that matter.',
  },
  {
    icon: 'images-outline',
    title: 'Walk through every room',
    body: 'Get a fully furnished apartment with photoreal renders of each room.',
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { update } = useSettings();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const finish = () => {
    update({ hasSeenOnboarding: true });
    router.replace('/');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToOffset({ offset: (index + 1) * width });
      setIndex(index + 1);
    } else finish();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        <AppText variant="title">clsr</AppText>
        {index < SLIDES.length - 1 && <Button title="Skip" variant="ghost" compact onPress={finish} />}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.art, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name={item.icon} size={88} color={colors.accent} />
            </View>
            <AppText variant="display" style={styles.center}>
              {item.title}
            </AppText>
            <AppText variant="body" color="textMuted" style={styles.center}>
              {item.body}
            </AppText>
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              style={[styles.dot, { backgroundColor: i === index ? colors.text : colors.border, width: i === index ? 22 : 8 }]}
            />
          ))}
        </View>
        <Button title={index === SLIDES.length - 1 ? 'Get started' : 'Next'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, gap: spacing.lg },
  art: { width: 220, height: 220, borderRadius: radius.xl * 2, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  center: { textAlign: 'center' },
  bottom: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: radius.pill },
});
