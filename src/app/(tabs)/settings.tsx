import Constants from 'expo-constants';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectCard } from '@/components/connect';
import { StatusLine } from '@/components/status';
import { AppText, Button, LiveDot, SectionHeader } from '@/components/ui';
import { useServer } from '@/store/server';
import { fonts, radius, spacing, TAB_BAR_CLEARANCE, typography, useAppTheme } from '@/theme';

const SERVICES: { key: 'blender' | 'ollama' | 'coohom'; label: string; role: string }[] = [
  { key: 'blender', label: 'Blender', role: 'renders' },
  { key: 'ollama', label: 'Ollama', role: 'reasons' },
  { key: 'coohom', label: 'Coohom', role: 'catalogue' },
];

export default function StudioLinkScreen() {
  const { host, demo, reachability, checkHealth, disconnect } = useServer();
  const { colors } = useAppTheme();
  const connected = !!host || demo;

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <StatusLine />
          <View>
            <AppText variant="hero">Studio</AppText>
            <Text style={[typography.hero, { fontFamily: fonts.displayItalic, color: colors.accent }]}>link.</Text>
          </View>
        </View>

        {connected && (
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <AppText variant="overline">{demo ? 'Source' : 'Address'}</AppText>
            <AppText variant="monoLarge" numberOfLines={1} adjustsFontSizeToFit>
              {demo ? 'built-in demo' : host.replace(/^https?:\/\//, '')}
            </AppText>

            {!demo && (
              <View style={styles.lamps}>
                {SERVICES.map((s) => {
                  const known = reachability.state === 'ok';
                  const up = known && reachability.health[s.key];
                  const tint = !known ? colors.textFaint : up ? colors.success : colors.danger;
                  return (
                    <View key={s.key} style={[styles.lamp, { borderColor: colors.border }]}>
                      <LiveDot color={tint} pulsing={!!up} size={9} />
                      <AppText variant="label">{s.label}</AppText>
                      <AppText variant="overline" style={{ fontSize: 9 }}>
                        {!known ? '—' : up ? s.role : 'offline'}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.actions}>
              {!demo && <Button title="Check again" icon="pulse" variant="secondary" compact onPress={checkHealth} />}
              <Button title={demo ? 'Leave demo' : 'Disconnect'} variant="ghost" compact onPress={disconnect} />
            </View>
          </View>
        )}

        <View>
          <SectionHeader title={connected ? 'Address and token' : 'Connect'} />
          <ConnectCard showDemo={!demo} />
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
