import type { ClsrClient } from './client';
import { MockClsrClient } from './mock';

export * from './types';
export type { ClsrClient } from './client';

/**
 * The single client instance used across the app.
 *
 * TODO(clsr): once the CLSR API spec is available, add an HTTP implementation
 * of `ClsrClient` and select it here (e.g. when EXPO_PUBLIC_CLSR_API_URL is set).
 */
export const clsr: ClsrClient = new MockClsrClient();
