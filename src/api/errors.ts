export type ClsrErrorKind =
  /** Network failure or timeout: the server is off, asleep, or not on this network. */
  | 'unreachable'
  /** 409: the server is already running a job (one at a time, server-wide). */
  | 'busy'
  | 'not_found'
  | 'bad_request'
  | 'server'
  /** Not available in demo mode. */
  | 'unsupported';

export class ClsrError extends Error {
  constructor(
    readonly kind: ClsrErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ClsrError';
  }
}

export function describeError(e: unknown): string {
  if (e instanceof ClsrError) {
    if (e.kind === 'unreachable') return "Can't reach the CLSR server. Check that the PC is on and you're on the same network or VPN.";
    if (e.kind === 'busy') return 'This flat is being changed right now. Try again when the current render finishes.';
    return e.message;
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}
