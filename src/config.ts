/**
 * Where the CLSR backend lives. Set in `.env` (see `.env.example`), not in
 * source: both values change when the backend moves off the studio PC.
 *
 * EXPO_PUBLIC_* values are inlined into the app bundle at build time, so the
 * token is a shared key for this deployment, not a secret per user.
 * The Server screen can override both on a device; that override is remembered.
 */
export const config = {
  baseUrl: process.env.EXPO_PUBLIC_CLSR_URL ?? '',
  token: process.env.EXPO_PUBLIC_CLSR_TOKEN ?? '',
};
