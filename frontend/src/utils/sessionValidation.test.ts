import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { validateSessionWithRetry, isSessionExpired } from './sessionValidation'
import { retryScenarioArb } from '@/test/generators'
import type { Session } from '@supabase/supabase-js'

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn()
    }
  }
}))

import { supabase } from '@/lib/supabase'

describe('Feature: session-expiry-fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Property 3: Retry with Exponential Backoff', () => {
    it('should retry with exponential backoff on network errors', async () => {
      await fc.assert(
        fc.asyncProperty(retryScenarioArb, async ({ maxRetries, failuresBeforeSuccess, errorType }) => {
          // Skip invalid scenarios where failures exceed or equal retries
          // When failuresBeforeSuccess >= maxRetries, all retries are exhausted before success
          if (failuresBeforeSuccess >= maxRetries) {
            return true
          }

          const callTimes: number[] = []
          let callCount = 0

          // Mock getUser to fail with network errors then succeed
          vi.mocked(supabase.auth.getUser).mockImplementation(async () => {
            callCount++
            callTimes.push(Date.now())

            if (callCount <= failuresBeforeSuccess) {
              throw new Error(`${errorType} error`)
            }

            return {
              data: { user: { id: 'test-user', email: 'test@example.com' } },
              error: null
            } as any
          })

          // Mock getSession to return valid session
          vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: {
              session: {
                access_token: 'valid-token',
                expires_at: Math.floor(Date.now() / 1000) + 3600
              } as Session
            },
            error: null
          } as any)

          const result = await validateSessionWithRetry(maxRetries)

          // Verify retry count
          expect(callCount).toBe(failuresBeforeSuccess + 1)

          // Verify exponential backoff timing
          if (callTimes.length > 1) {
            for (let i = 1; i < callTimes.length; i++) {
              const delay = callTimes[i] - callTimes[i - 1]
              const expectedMinDelay = Math.pow(2, i - 1) * 1000 * 0.9 // 90% tolerance
              const expectedMaxDelay = Math.pow(2, i - 1) * 1000 * 1.5 // 150% tolerance

              // Verify delay is within expected range (with tolerance for timing variations)
              expect(delay).toBeGreaterThanOrEqual(expectedMinDelay)
              expect(delay).toBeLessThanOrEqual(expectedMaxDelay)
            }
          }

          // If failures < maxRetries, should eventually succeed
          if (failuresBeforeSuccess < maxRetries) {
            expect(result.valid).toBe(true)
            expect(result.user).toBeDefined()
          } else {
            // If all retries exhausted, should fail
            expect(result.valid).toBe(false)
            expect(result.error?.type).toBe('network')
          }

          return true
        }),
        { numRuns: 10, timeout: 60000 } // Reduced runs, increased timeout for backoff delays
      )
    }, 60000) // Set test timeout to 60 seconds

    it('should not retry on non-network errors', async () => {
      let callCount = 0

      // Mock getUser to fail with non-network error
      vi.mocked(supabase.auth.getUser).mockImplementation(async () => {
        callCount++
        return {
          data: { user: null },
          error: { message: 'Invalid token' }
        } as any
      })

      const result = await validateSessionWithRetry(3)

      // Should only call once (no retries for non-network errors)
      expect(callCount).toBe(1)
      expect(result.valid).toBe(false)
      expect(result.error?.type).toBe('expired')
    })

    it('should fail after max retries exhausted', async () => {
      let callCount = 0

      // Mock getUser to always fail with network error
      vi.mocked(supabase.auth.getUser).mockImplementation(async () => {
        callCount++
        throw new Error('network error')
      })

      const result = await validateSessionWithRetry(3)

      // Should call maxRetries times
      expect(callCount).toBe(3)
      expect(result.valid).toBe(false)
      expect(result.error?.type).toBe('network')
      expect(result.error?.retryable).toBe(true)
    })
  })

  describe('isSessionExpired', () => {
    it('should return false for sessions without expires_at', () => {
      const session = { expires_at: undefined } as Session
      expect(isSessionExpired(session)).toBe(false)
    })

    it('should return true for expired sessions', () => {
      const session = {
        expires_at: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      } as Session
      expect(isSessionExpired(session)).toBe(true)
    })

    it('should return false for valid sessions', () => {
      const session = {
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      } as Session
      expect(isSessionExpired(session)).toBe(false)
    })
  })
})
