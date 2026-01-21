/**
 * Enterprise-grade query helpers for handling timeouts and stuck promises
 */

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message
 * @returns Promise that rejects if timeout is reached
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Query timeout'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Safely executes a Supabase query with timeout and error handling
 * @param queryFn - Function that returns a Supabase query promise
 * @param defaultValue - Default value to return on error
 * @param timeoutMs - Timeout in milliseconds
 * @returns Query result or default value
 */
export async function safeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any; count?: number | null }>,
  defaultValue: T,
  timeoutMs: number = 10000
): Promise<{ data: T; error: any | null }> {
  try {
    const result = await withTimeout(queryFn(), timeoutMs, 'Query timeout exceeded');
    
    if (result.error) {
      console.error('Query error:', result.error);
      return { data: defaultValue, error: result.error };
    }
    
    return { data: result.data ?? defaultValue, error: null };
  } catch (error) {
    console.error('Query failed:', error);
    return { 
      data: defaultValue, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Safely executes a Supabase count query with timeout
 * @param queryFn - Function that returns a Supabase count query promise
 * @param timeoutMs - Timeout in milliseconds
 * @returns Count or 0 on error
 */
export async function safeCountQuery(
  queryFn: () => Promise<{ count: number | null; error: any }>,
  timeoutMs: number = 10000
): Promise<number> {
  try {
    const result = await withTimeout(queryFn(), timeoutMs, 'Count query timeout');
    
    if (result.error) {
      console.error('Count query error:', result.error);
      return 0;
    }
    
    return result.count ?? 0;
  } catch (error) {
    console.error('Count query failed:', error);
    return 0;
  }
}

/**
 * Creates an AbortController with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortController that auto-aborts after timeout
 */
export function createTimeoutController(timeoutMs: number = 30000): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}
