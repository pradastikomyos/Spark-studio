import { isNetworkIssue } from '../auth/sessionErrors'
import { readCurrentSessionSnapshot } from '../auth/sessionAccess'
import { supabase } from '@/lib/supabase'
import { withTimeout } from './queryHelpers'
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
export async function validateSessionWithRetry(
  maxRetries = 3,
  requestTimeoutMs = 5000
): Promise<ValidationResult> {
  try {
    const session = await readCurrentSessionSnapshot(requestTimeoutMs, 'Auth getSession timeout')

    if (!session) {
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

    let attempt = 0
    let backoffMs = 1000 // Start with 1 second

    while (attempt < maxRetries) {
      try {
        const { data: { user }, error: userError } = await withTimeout(
          supabase.auth.getUser(),
          requestTimeoutMs,
          'Auth getUser timeout'
        )

        if (userError || !user) {
          return {
            valid: false,
            error: {
              type: 'expired',
              message: 'Your session has expired. Please log in again to continue.',
              retryable: false
            }
          }
        }

        return {
          valid: true,
          user,
          session
        }
      } catch (error) {
        attempt++
        const isNetworkError = isNetworkIssue(error)

        if (attempt >= maxRetries) {
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
          await new Promise(resolve => setTimeout(resolve, backoffMs))
          backoffMs *= 2
        } else {
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
  } catch (error) {
    const isNetworkError = isNetworkIssue(error)

    return {
      valid: false,
      error: {
        type: isNetworkError ? 'network' : 'invalid',
        message: isNetworkError
          ? 'Unable to verify your session. Please check your connection and try again.'
          : 'Unable to verify your session. Please try again.',
        retryable: isNetworkError
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
