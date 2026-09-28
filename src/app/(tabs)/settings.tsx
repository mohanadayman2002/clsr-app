import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectCard } from '@/components/connect';
import { AppText, Badge, Button, Card, SectionHeader } from '@/components/ui';
import { useServer } from '@/store/server';
import { spacing, useAppTheme } from '@/theme';

const SERVICES: { key: 'blender' | 'ollama' | 'coohom'; label: string }[] = [
  { key: 'blender', label: 'Blender (rendering)' },
  { key: 'ollama', label: 'Ollama' },
  { key: 'coohom', label: 'Coohom' },
];

export default function ServerScreen() {
  const { host, demo, reachability, checkHealth, disconnect } = useServer();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="display">Server</AppText>

        {(host || demo) && (
          <View>
            <SectionHeader title="Current connection" />
            <Card style={styles.rows}>
              <View style={styles.row}>
                <AppText variant="label" style={styles.flex} numberOfLines={1}>
                  {demo ? 'Demo data' : host}
                </AppText>
                {demo ? (
                  <Badge label="Demo" tone="warning" />
                ) : reachability.state === 'ok' ? (
                  <Badge label="Online" tone="success" />
                ) : reachability.state === 'unauthorized' ? (
                  <Badge label="Token rejected" tone="danger" />
                ) : reachability.state === 'checking' ? (
                  <Badge label="Checking…" />
                ) : (
                  <Badge label="Unreachable" tone="danger" />
                )}
              </View>
              {!demo &&
                SERVICES.map((s) => {
                  const up = reachability.state === 'ok' && reachability.health[s.key];
                  return (
                    <View key={s.key} style={styles.row}>
                      <Ionicons
                        name={up ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={up ? colors.success : colors.textFaint}
                      />
                      <AppText variant="body" style={styles.flex}>
                        {s.label}
                      </AppText>
                    </View>
                  );
                })}
              <View style={styles.actions}>
                {!demo && <Button title="Check again" icon="refresh" variant="secondary" compact onPress={checkHealth} />}
                <Button title={demo ? 'Leave demo' : 'Disconnect'} variant="ghost" compact onPress={disconnect} />
              </View>
            </Card>
          </View>
        )}

        <View>
          <SectionHeader title={host || demo ? 'Address and token' : 'Connect'} />
          <ConnectCard showDemo={!demo} />
        </View>

        <AppText variant="caption" style={styles.version}>
          CLSR · version {Constants.expoConfig?.version ?? '—'}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  version: { textAlign: 'center' },
});
