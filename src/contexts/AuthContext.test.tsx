import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, renderHook } from '@testing-library/react'
import fc from 'fast-check'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { validateSessionWithRetry } from '../utils/sessionValidation'
import { isAdmin } from '../utils/auth'
import { validationResultArb } from '../test/generators'

// Mock dependencies
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            getUser: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
        }
    }
}))

vi.mock('../utils/sessionValidation', () => ({
    validateSessionWithRetry: vi.fn()
}))

vi.mock('../utils/auth', () => ({
    isAdmin: vi.fn()
}))

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default mock implementation
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any)
        vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as any)
        vi.mocked(validateSessionWithRetry).mockResolvedValue({ valid: false })
        vi.mocked(isAdmin).mockResolvedValue(false)
    })

    describe('Task 2.1: Property 1 - Session Validation on Initialization', () => {
        it('should correctly initialize state based on validation results', async () => {
            await fc.assert(
                fc.asyncProperty(validationResultArb, async (validationResult) => {
                    vi.clearAllMocks()

                    // Mock initial session to trigger validation
                    const mockSession = validationResult.valid ? validationResult.session : { access_token: 'some-token' }
                    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: mockSession }, error: null } as any)
                    vi.mocked(validateSessionWithRetry).mockResolvedValue(validationResult)

                    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

                    await waitFor(() => expect(result.current.initialized).toBe(true), { timeout: 2000 })

                    if (validationResult.valid) {
                        expect(result.current.user).toEqual(validationResult.user)
                        expect(result.current.session).toEqual(validationResult.session)
                    } else if (validationResult.error?.type !== 'network') {
                        expect(result.current.user).toBeNull()
                        expect(supabase.auth.signOut).toHaveBeenCalled()
                    }
                }),
                { numRuns: 20 }
            )
        })
    })

    describe('Task 2.2: Property 2 - Invalid Session Cleanup', () => {
        it('should cleanup on expiry but not necessarily on network error', async () => {
            // Test definitive expiry
            vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'expired' } }, error: null } as any)
            vi.mocked(validateSessionWithRetry).mockResolvedValue({
                valid: false,
                error: { type: 'expired', message: 'Expired', retryable: false }
            })

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))
            expect(supabase.auth.signOut).toHaveBeenCalled()
        })
    })

    describe('Task 2.3: Property 16 - Server-Side Token Validation Authority', () => {
        it('should always respect the server-side validation result over local state', async () => {
            await fc.assert(
                fc.asyncProperty(validationResultArb, async (validationResult) => {
                    vi.clearAllMocks()
                    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'local' } }, error: null } as any)
                    vi.mocked(validateSessionWithRetry).mockResolvedValue(validationResult)

                    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
                    await waitFor(() => expect(result.current.initialized).toBe(true))

                    if (validationResult.valid) {
                        expect(result.current.user).toEqual(validationResult.user)
                    } else if (validationResult.error?.type !== 'network') {
                        expect(result.current.user).toBeNull()
                        expect(supabase.auth.signOut).toHaveBeenCalled()
                    }
                }),
                { numRuns: 20 }
            )
        })
    })

    describe('Timeout Handling', () => {
        it('should handle getSession timeout', async () => {
            vi.mocked(supabase.auth.getSession).mockImplementation(() => new Promise(() => { })) // Never resolves

            vi.useFakeTimers()

            renderHook(() => useAuth(), { wrapper: AuthProvider })

            // Advance time by 5.1s
            await vi.advanceTimersByTimeAsync(5100)

            // It should have caught the timeout and called signOut
            expect(supabase.auth.signOut).toHaveBeenCalled()

            vi.useRealTimers()
        })
    })

    describe('validateSession method', () => {
        it('should update state and return true on success', async () => {
            const mockResult = {
                valid: true,
                user: { id: 'user-1' },
                session: { access_token: 'token-1', user: { id: 'user-1' } }
            }
            vi.mocked(validateSessionWithRetry).mockResolvedValue(mockResult as any)

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))

            let success: boolean = false
            await waitFor(async () => {
                success = await result.current.validateSession()
                return success === true
            })

            expect(success).toBe(true)
            await waitFor(() => expect(result.current.user?.id).toBe('user-1'))
        })

        it('should return false and sign out on failure', async () => {
            vi.mocked(validateSessionWithRetry).mockResolvedValue({
                valid: false,
                error: { type: 'expired', message: 'Expired', retryable: false }
            })

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))

            const success = await result.current.validateSession()
            expect(success).toBe(false)
            expect(supabase.auth.signOut).toHaveBeenCalled()
        })
    })
})
