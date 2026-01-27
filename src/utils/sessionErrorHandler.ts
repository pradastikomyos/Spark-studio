import { supabase } from '../lib/supabase'
import { preserveBookingState, type BookingState } from './bookingStateManager'

export interface SessionErrorHandlerOptions {
  onSessionExpired?: (returnPath: string, state?: unknown) => void
  onNetworkError?: (error: Error) => void
  preserveState?: boolean
}

/**
 * Centralized error handler for session-related errors
 */
export class SessionErrorHandler {
  private options: SessionErrorHandlerOptions

  constructor(options: SessionErrorHandlerOptions = {}) {
    this.options = options
  }

  /**
   * Handles authentication errors with appropriate recovery strategies
   * @param error The error to handle
   * @param context Context information for error handling
   */
  async handleAuthError(
    error: unknown,
    context: {
      returnPath: string
      state?: unknown
    }
  ): Promise<void> {
    // Log error with structured utility
    const isExpired = this.isSessionExpiredError(error);
    const isNetwork = this.isNetworkError(error);
    const errorType = isExpired ? 'session_expired' :
      isNetwork ? 'network' : 'unknown';

    const log = createErrorLog(
      errorType,
      context.returnPath,
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error',
      {
        hasBookingState: !!context.state,
        returnPath: context.returnPath
      }
    );

    logError(log);

    if (this.isSessionExpiredError(error)) {
      // Preserve booking state if requested
      if (this.options.preserveState && context.state) {
        preserveBookingState(context.state as BookingState)
      }

      // Clear auth state
      await supabase.auth.signOut()

      // Trigger callback if provided
      if (this.options.onSessionExpired) {
        this.options.onSessionExpired(context.returnPath, context.state)
      } else {
        // Fallback alert if no callback provided
        alert('Your session has expired for security. Please log in again to continue.');
      }
    } else if (this.isNetworkError(error)) {
      // Log network error
      console.error('Network error detected:', error);

      // Trigger network error callback or fallback alert
      if (this.options.onNetworkError && error instanceof Error) {
        this.options.onNetworkError(error)
      } else {
        alert('We\'re having trouble connecting to the server. Please check your internet connection and try again.');
      }
    }
  }

  /**
   * Checks if an error is a session expiry error (401)
   */
  private isSessionExpiredError(error: unknown): boolean {
    if (error instanceof Response) {
      return error.status === 401
    }
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as { status: number }).status === 401
    }
    return false
  }

  /**
   * Checks if an error is a network error
   */
  private isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('fetch')
      )
    }
    return false
  }
}

/**
 * Logs session-related errors with context
 */
export interface SessionErrorLog {
  timestamp: string
  errorType: 'session_expired' | 'network' | 'validation' | 'unknown'
  userId?: string
  location: string
  errorMessage: string
  stackTrace?: string
  context: {
    hasBookingState: boolean
    returnPath?: string
    attemptNumber?: number
  }
}

/**
 * Creates a structured error log entry
 */
export function createErrorLog(
  errorType: SessionErrorLog['errorType'],
  location: string,
  errorMessage: string,
  context: SessionErrorLog['context'],
  userId?: string,
  stackTrace?: string
): SessionErrorLog {
  return {
    timestamp: new Date().toISOString(),
    errorType,
    userId,
    location,
    errorMessage,
    stackTrace,
    context
  }
}

/**
 * Logs an error to console (can be extended to send to error tracking service)
 */
export function logError(log: SessionErrorLog): void {
  console.error('Session Error Log:', log)
  // TODO: Send to error tracking service (e.g., Sentry) in production
}
