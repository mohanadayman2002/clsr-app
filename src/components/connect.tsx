import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useServer } from '@/store/server';
import { radius, spacing, typography, useAppTheme } from '@/theme';

import { AppText, Button, Card } from './ui';

/** Host entry used on first run and in Settings. */
export function ConnectCard({ showDemo = true }: { showDemo?: boolean }) {
  const { host, connect, enterDemo, reachability } = useServer();
  const { colors } = useAppTheme();
  const [input, setInput] = useState(host.replace(/^https?:\/\//, ''));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    setBusy(true);
    setFailed(!(await connect(input)));
    setBusy(false);
  };

  return (
    <Card style={styles.card}>
      <AppText variant="heading">Connect to CLSR Studio</AppText>
      <AppText variant="caption">
        Enter the address of the PC running CLSR. The phone must be on the same network or VPN. Port 8765 is added if you leave it out.
      </AppText>
      <TextInput
        value={input}
        onChangeText={(t) => {
          setInput(t);
          setFailed(false);
        }}
        placeholder="192.168.1.20"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={submit}
        style={[styles.input, typography.body, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />
      {failed && reachability.state === 'unreachable' && (
        <AppText variant="caption" color="danger">
          No answer from that address. Saved anyway — check the PC is awake and CLSR is running, then pull to refresh.
        </AppText>
      )}
      <View style={styles.actions}>
        <Button title="Connect" icon="link-outline" loading={busy} disabled={!input.trim()} onPress={submit} style={styles.flex} />
        {showDemo && <Button title="Try demo" variant="secondary" onPress={enterDemo} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
