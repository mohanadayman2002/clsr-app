import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { DEFAULT_HOST, useServer, type Reachability } from '@/store/server';
import { radius, spacing, typography, useAppTheme } from '@/theme';

import { AppText, Button, Card } from './ui';

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

  const inputStyle = [styles.input, typography.body, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];

  return (
    <Card style={styles.card}>
      <AppText variant="heading">Connect to CLSR Studio</AppText>
      <AppText variant="caption">
        The address of the PC running CLSR. The phone must be on the same network or ZeroTier. Port 8765 is added if you leave it out.
      </AppText>
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
      <View style={styles.field}>
        <AppText variant="label">Access token (optional)</AppText>
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
        <Button title="Connect" icon="link-outline" loading={busy} disabled={!hostInput.trim()} onPress={submit} style={styles.flex} />
        {showDemo && <Button title="Try demo" variant="secondary" onPress={enterDemo} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  field: { gap: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
