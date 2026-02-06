import { supabase } from './supabase';

/**
 * Custom error type with status code for better error handling
 */
export interface APIError extends Error {
  status: number;
  info?: unknown;
}

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
};

const getErrorCode = (error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : String(code);
  }
  return null;
};

export const DEFAULT_QUERY_TIMEOUT_MS = 10000;

export function createQuerySignal(signal: AbortSignal | undefined, timeoutMs = DEFAULT_QUERY_TIMEOUT_MS) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Timeout', 'TimeoutError'));
  }, timeoutMs);

  const handleAbort = () => {
    if (timedOut) return;
    controller.abort(signal?.reason);
  };

  if (signal) {
    signal.addEventListener('abort', handleAbort, { once: true });
  }

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  };

  return { signal: controller.signal, cleanup, didTimeout: () => timedOut };
}

/**
 * Generic Supabase fetcher for SWR
 * Works with any Supabase query that returns a promise
 * 
 * @param queryFn - A function that executes and returns a Supabase query
 * @returns Promise with data array or throws APIError
 * 
 * @example
 * const { data } = useSWR(
 *   'products',
 *   () => supabaseFetcher(async () => supabase.from('products').select('*'))
 * );
 */
export async function supabaseFetcher<T>(
  queryFn: () => Promise<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const { data, error } = await queryFn();
  
  if (error) {
    const err = new Error(getErrorMessage(error)) as APIError;
    const code = getErrorCode(error);
    err.status = code === 'PGRST116' ? 404 : 500;
    err.info = error;
    throw err;
  }
  
  return data || [];
}

/**
 * Fetcher for list queries with optional filters
 * 
 * @param table - Table name
 * @param select - Columns to select (default: '*')
 * @param filters - Optional filter function to apply to query
 * @returns Promise with data array or throws APIError
 * 
 * @example
 * const { data } = useSWR(
 *   ['products', 'active'],
 *   () => supabaseListFetcher('products', '*', (q) => q.eq('is_active', true))
 * );
 */
export async function supabaseListFetcher<T = unknown>(
  table: string,
  select: string = '*',
  filters?: (query: unknown) => unknown
): Promise<T[]> {
  let query = supabase.from(table).select(select) as unknown;
  
  if (filters) {
    query = filters(query);
  }
  
  const { data, error } = await (query as Promise<{ data: T[] | null; error: unknown }>);
  
  if (error) {
    const err = new Error(getErrorMessage(error)) as APIError;
    const code = getErrorCode(error);
    err.status = code === 'PGRST116' ? 404 : 500;
    err.info = error;
    throw err;
  }
  
  return (data || []) as T[];
}

/**
 * Fetcher for single record by ID
 * 
 * @param table - Table name
 * @param id - Record ID (string or number)
 * @param select - Columns to select (default: '*')
 * @returns Promise with single record or null if not found
 * 
 * @example
 * const { data } = useSWR(
 *   ['product', productId],
 *   () => supabaseSingleFetcher('products', productId)
 * );
 */
export async function supabaseSingleFetcher<T = unknown>(
  table: string,
  id: string | number,
  select: string = '*'
): Promise<T | null> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .single();
  
  if (error) {
    const code = getErrorCode(error);
    if (code === 'PGRST116') {
      return null; // Not found
    }
    const err = new Error(getErrorMessage(error)) as APIError;
    err.status = 500;
    err.info = error;
    throw err;
  }
  
  return data as T;
}

/**
 * Fetcher for authenticated user data
 * Automatically checks for valid session before executing query
 * 
 * @param queryFn - A function that executes and returns a Supabase query
 * @returns Promise with data array or throws APIError (401 if not authenticated)
 * 
 * @example
 * const { data } = useSWR(
 *   'my-bookings',
 *   () => supabaseAuthFetcher(async () => 
 *     supabase.from('bookings').select('*').eq('user_id', user.id)
 *   )
 * );
 */
export async function supabaseAuthFetcher<T>(
  queryFn: (signal?: AbortSignal) => Promise<{ data: T[] | null; error: unknown }>,
  signal?: AbortSignal
): Promise<T[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    const err = new Error('Unauthorized') as APIError;
    err.status = 401;
    throw err;
  }
  
  return supabaseFetcher<T>(() => queryFn(signal));
}
