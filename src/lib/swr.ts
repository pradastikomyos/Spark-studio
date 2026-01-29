import { SWRConfiguration } from 'swr';

/**
 * Global SWR configuration for Spark Photo Studio
 * 
 * This configuration provides:
 * - Automatic retry with exponential backoff
 * - Request deduplication
 * - Background revalidation
 * - Cache persistence across component remounts
 * - Supabase-specific error handling
 */
export const swrConfig: SWRConfiguration = {
  // Revalidation settings
  revalidateOnFocus: true, // Revalidate when window regains focus
  revalidateOnReconnect: true, // Revalidate when network reconnects
  dedupingInterval: 2000, // Deduplicate requests within 2 seconds
  
  // Cache settings
  focusThrottleInterval: 5000, // Throttle focus revalidation to 5 seconds
  
  // Error handling
  shouldRetryOnError: true,
  errorRetryCount: 3, // Maximum 3 retry attempts
  errorRetryInterval: 5000, // Base retry interval: 5 seconds
  
  /**
   * Custom retry logic with exponential backoff
   * Retry delays: 1s, 2s, 4s
   */
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    // Don't retry on 404 (Not Found)
    if (error.status === 404) return;
    
    // Don't retry after 3 attempts
    if (retryCount >= 3) return;
    
    // Exponential backoff: 1s, 2s, 4s
    setTimeout(() => revalidate({ retryCount }), 1000 * Math.pow(2, retryCount));
  },
  
  /**
   * Global error handler
   * Logs errors for debugging
   * Component-level error handling should use the error return value from useSWR
   */
  onError: (error, key) => {
    console.error(`SWR Error [${key}]:`, error);
    // Note: Toast notifications are handled at component level
    // to provide context-specific error messages
  }
};
