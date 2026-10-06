import { StyleSheet, Text, View } from 'react-native';

import { useServer } from '@/store/server';
import { typography, useAppTheme } from '@/theme';

import { LiveDot } from './ui';

/** One mono line saying where the app is connected and whether the renderer is up. */
export function StatusLine() {
  const { demo, host, reachability } = useServer();
  const { colors } = useAppTheme();
  const address = host.replace(/^https?:\/\//, '');

  const [color, text, pulsing] = demo
    ? [colors.warning, 'Demo · sample flats', false]
    : !host
      ? [colors.textFaint, 'Not connected', false]
      : reachability.state === 'ok'
        ? reachability.health.blender
          ? [colors.success, `${address} · renderer ready`, true]
          : [colors.warning, `${address} · Blender offline`, false]
        : reachability.state === 'checking' || reachability.state === 'unknown'
          ? [colors.textMuted, `${address} · checking`, true]
          : reachability.state === 'unauthorized'
            ? [colors.danger, `${address} · token rejected`, false]
            : [colors.danger, `${address} · unreachable`, false];

  return (
    <View style={styles.row}>
      <LiveDot color={color} size={7} pulsing={pulsing} />
      <Text style={[typography.overline, { color: colors.textMuted, fontSize: 10 }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -5 },
});
