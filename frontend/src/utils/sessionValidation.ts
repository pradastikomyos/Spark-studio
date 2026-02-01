import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export interface ValidationResult {
  valid: boolean
  user?: User
  session?: Session
  error?: {
    type: 'expired' | 'invalid' | 'network'
    message: string
    retryable: boolean
  }
}

/**
 * Validates a session with retry logic and exponential backoff
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns ValidationResult indicating if session is valid
 */
export async function validateSessionWithRetry(maxRetries = 3): Promise<ValidationResult> {
  let attempt = 0
  let backoffMs = 1000 // Start with 1 second

  while (attempt < maxRetries) {
    try {
      // Validate token with server
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        // Session invalid on server
        return {
          valid: false,
          error: {
            type: 'expired',
            message: 'Your session has expired. Please log in again to continue.',
            retryable: false
          }
        }
      }

      // Verify session has valid expiry
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        return {
          valid: false,
          error: {
            type: 'invalid',
            message: 'Your session is invalid. Please log in again.',
            retryable: false
          }
        }
      }

      if (isSessionExpired(session)) {
        return {
          valid: false,
          error: {
            type: 'expired',
            message: 'Your session has expired. Please log in again to continue.',
            retryable: false
          }
        }
      }

      // Session is valid
      return {
        valid: true,
        user,
        session
      }
    } catch (error) {
      attempt++

      // Check if this is a network error
      const isNetworkError = error instanceof Error && (
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('fetch')
      )

      if (attempt >= maxRetries) {
        // All retries failed
        return {
          valid: false,
          error: {
            type: 'network',
            message: 'Unable to verify your session. Please check your connection and try again.',
            retryable: true
          }
        }
      }

      if (isNetworkError) {
        // Wait with exponential backoff before retrying
        await new Promise(resolve => setTimeout(resolve, backoffMs))
        backoffMs *= 2
      } else {
        // Non-network error, don't retry
        return {
          valid: false,
          error: {
            type: 'invalid',
            message: 'Unable to verify your session. Please try again.',
            retryable: false
          }
        }
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    valid: false,
    error: {
      type: 'network',
      message: 'Unable to verify your session. Please check your connection and try again.',
      retryable: true
    }
  }
}

/**
 * Checks if a session has expired based on its expiry timestamp
 * @param session The session to check
 * @returns true if session is expired, false otherwise
 */
export function isSessionExpired(session: Session): boolean {
  if (!session.expires_at) return false
  return new Date(session.expires_at * 1000) < new Date()
}

/**
 * Validates session on initialization with timeout protection
 * @param timeoutMs Maximum time to wait for validation (default: 5000ms)
 * @returns ValidationResult or null if timeout
 */
export async function validateSessionOnInit(timeoutMs = 5000): Promise<ValidationResult | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs)
  })

  const validationPromise = validateSessionWithRetry()

  const result = await Promise.race([validationPromise, timeoutPromise])
  return result
}
