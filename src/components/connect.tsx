import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { DEFAULT_HOST, useServer, type Reachability } from '@/store/server';
import { radius, spacing, typography, useAppTheme } from '@/theme';

import { AppText, Button } from './ui';

const stripScheme = (host: string) => host.replace(/^https?:\/\//, '');

function failureMessage(result: Reachability): string | undefined {
  if (result.state === 'unauthorized') return 'The server wants an access token, or the one entered is wrong.';
  if (result.state === 'unreachable')
    return 'No answer from that address. Saved anyway — check the PC is awake, CLSR is running and ZeroTier is connected, then pull to refresh.';
  return undefined;
}

/** Host and optional token entry, used on first run and in the Server tab. */
export function ConnectCard({ showDemo = true }: { showDemo?: boolean }) {
  const { host, token, connect, enterDemo } = useServer();
  const { colors } = useAppTheme();
  const [hostInput, setHostInput] = useState(stripScheme(host || DEFAULT_HOST));
  const [tokenInput, setTokenInput] = useState(token);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setBusy(true);
    setError(failureMessage(await connect(hostInput, tokenInput)));
    setBusy(false);
  };

  const inputStyle = [styles.input, typography.mono, { fontSize: 16, color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }];

  return (
    <View style={styles.card}>
      <AppText variant="caption">
        The PC running CLSR, over the same network or ZeroTier. Port 8765 is added if you leave it out.
      </AppText>
      <View style={styles.field}>
        <AppText variant="overline">Address</AppText>
        <TextInput
          value={hostInput}
          onChangeText={(t) => {
            setHostInput(t);
            setError(undefined);
          }}
          placeholder={stripScheme(DEFAULT_HOST)}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={submit}
          accessibilityLabel="Server address"
          style={inputStyle}
        />
      </View>
      <View style={styles.field}>
        <AppText variant="overline">Access token · optional</AppText>
        <TextInput
          value={tokenInput}
          onChangeText={(t) => {
            setTokenInput(t);
            setError(undefined);
          }}
          placeholder="Only if the server sets CLSR_TOKEN"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={submit}
          accessibilityLabel="Access token"
          style={inputStyle}
        />
      </View>
      {error && (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      )}
      <View style={styles.actions}>
        <Button title="Connect" icon="radio-outline" variant="accent" loading={busy} disabled={!hostInput.trim()} onPress={submit} style={styles.flex} />
        {showDemo && <Button title="Try demo" variant="secondary" onPress={enterDemo} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  field: { gap: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
