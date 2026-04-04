import { supabase } from '../lib/supabase';
import { withTimeout } from '../utils/queryHelpers';

export type SessionLike = {
  access_token?: string | null;
  expires_at?: number | null;
} | null;

export const ACCESS_TOKEN_BUFFER_MS = 60 * 1000;
const DEFAULT_SESSION_TIMEOUT_MS = 8000;

export function hasFreshAccessToken(
  session: SessionLike,
  bufferMs: number = ACCESS_TOKEN_BUFFER_MS
) {
  if (!session?.access_token) {
    return false;
  }

  if (!session.expires_at) {
    return true;
  }

  return session.expires_at * 1000 - Date.now() > bufferMs;
}

export async function readCurrentSessionSnapshot(
  timeoutMs: number = DEFAULT_SESSION_TIMEOUT_MS,
  timeoutMessage = 'Session fetch timeout'
) {
  const {
    data: { session },
  } = await withTimeout(supabase.auth.getSession(), timeoutMs, timeoutMessage);

  return session ?? null;
}

export async function readCurrentAccessToken(
  timeoutMs: number = DEFAULT_SESSION_TIMEOUT_MS,
  timeoutMessage = 'Session fetch timeout'
) {
  const session = await readCurrentSessionSnapshot(timeoutMs, timeoutMessage);
  return session?.access_token ?? null;
}

export async function getValidatedAccessToken(params: {
  session: SessionLike;
  validateSession: () => Promise<boolean>;
  timeoutMs?: number;
  timeoutMessage?: string;
}) {
  const { session, validateSession, timeoutMs, timeoutMessage } = params;
  const latestSession = await readCurrentSessionSnapshot(timeoutMs, timeoutMessage).catch(() => null);
  const sessionToUse =
    latestSession?.access_token && latestSession.access_token !== session?.access_token ? latestSession : session;

  if (hasFreshAccessToken(sessionToUse)) {
    return sessionToUse?.access_token ?? null;
  }

  const isValid = await validateSession();
  if (!isValid) {
    return null;
  }

  return readCurrentAccessToken(timeoutMs, timeoutMessage);
}

export async function refreshAndReadAccessToken(params: {
  refreshSession: () => Promise<void>;
  timeoutMs?: number;
  timeoutMessage?: string;
}) {
  await params.refreshSession();
  return readCurrentAccessToken(params.timeoutMs, params.timeoutMessage);
}
