import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectCard } from '@/components/connect';
import { StatusLine } from '@/components/status';
import { AppText, Blobs, Button, LiveDot, SectionHeader } from '@/components/ui';
import { useServer } from '@/store/server';
import { fonts, radius, shadow, spacing, TAB_BAR_CLEARANCE, typography, useAppTheme } from '@/theme';

const SERVICES: { key: 'blender' | 'ollama' | 'coohom'; label: string; role: string }[] = [
  { key: 'blender', label: 'Blender', role: 'renders' },
  { key: 'coohom', label: 'Coohom', role: 'reads plans' },
  { key: 'ollama', label: 'Ollama', role: 'plans rooms' },
];

export default function StudioLinkScreen() {
  const { host, reachability, checkHealth, resetToDefaults } = useServer();
  const { colors } = useAppTheme();
  const connected = !!host;
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Blobs width={width} height={230} inset={spacing.xl} />
          <StatusLine />
          <View>
            <AppText variant="hero">Studio</AppText>
            <Text style={[typography.hero, { fontFamily: fonts.displayItalic, color: colors.accent }]}>link.</Text>
          </View>
        </View>

        {connected && (
          <View style={[styles.panel, shadow, { backgroundColor: colors.surface, borderColor: colors.surface }]}>
            <AppText variant="overline">Address</AppText>
            <AppText variant="monoLarge" numberOfLines={1} adjustsFontSizeToFit>
              {host.replace(/^https?:\/\//, '')}
            </AppText>

            <View style={styles.lamps}>
              {SERVICES.map((s) => {
                const known = reachability.state === 'ok';
                const up = known && reachability.health[s.key];
                const tint = !known ? colors.textFaint : up ? colors.success : colors.danger;
                return (
                  <View key={s.key} style={[styles.lamp, { backgroundColor: up ? colors.successSoft : colors.surfaceMuted, borderColor: 'transparent' }]}>
                    <LiveDot color={tint} pulsing={!!up} size={9} />
                    <AppText variant="label">{s.label}</AppText>
                    <AppText variant="overline" style={{ fontSize: 9 }}>
                      {!known ? '—' : up ? s.role : 'offline'}
                    </AppText>
                  </View>
                );
              })}
            </View>

            <View style={styles.actions}>
              <Button title="Check again" icon="pulse" variant="secondary" compact onPress={checkHealth} />
              <Button title="Reset to default" variant="ghost" compact onPress={resetToDefaults} />
            </View>
          </View>
        )}

        <View>
          <SectionHeader title={connected ? 'Address and token' : 'Connect'} />
          <ConnectCard />
        </View>

        <AppText variant="overline" style={styles.version}>
          CLSR Studio · v{Constants.expoConfig?.version ?? '—'}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.xxl, paddingBottom: TAB_BAR_CLEARANCE },
  header: { gap: spacing.lg },
  panel: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  lamps: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  lamp: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, gap: 2, alignItems: 'flex-start' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  version: { textAlign: 'center' },
});
