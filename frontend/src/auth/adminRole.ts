import { createQuerySignal } from '../lib/fetchers';
import { supabase } from '../lib/supabase';

export const ADMIN_ROLE_CHECK_TIMEOUT_MS = 10000;
export const ADMIN_ROLES = new Set(['admin', 'super_admin', 'super-admin']);

export type AdminRoleLookupResult =
  | { ok: true; isAdmin: boolean }
  | { ok: false; transient: boolean };

export async function lookupAdminRole(
  userId: string | undefined,
  timeoutMs = ADMIN_ROLE_CHECK_TIMEOUT_MS
): Promise<AdminRoleLookupResult> {
  if (!userId) {
    return { ok: true, isAdmin: false };
  }

  const { signal, cleanup, didTimeout } = createQuerySignal(undefined, timeoutMs);

  try {
    const { data, error } = await supabase
      .from('user_role_assignments')
      .select('role_name')
      .eq('user_id', userId)
      .abortSignal(signal);

    if (error) {
      throw error;
    }

    const isAdmin =
      data?.some((row) => ADMIN_ROLES.has(String(row.role_name ?? '').toLowerCase())) ?? false;
    return { ok: true, isAdmin };
  } catch (error) {
    const isTransient =
      didTimeout() ||
      (error instanceof Error &&
        (error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('timeout') ||
          error.message.toLowerCase().includes('fetch')));

    return { ok: false, transient: isTransient };
  } finally {
    cleanup();
  }
}
