import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, renderHook, act } from '@testing-library/react'
import fc from 'fast-check'
import { AuthProvider, useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { validateSessionWithRetry } from '../utils/sessionValidation'
import { isAdmin } from '../utils/auth'
import { validationResultArb } from '../test/generators'

const mockRoleAbortSignal = vi.fn()
let authStateChangeHandler: ((event: string, session: any) => void) | null = null

// Mock dependencies
vi.mock('../lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    abortSignal: mockRoleAbortSignal
                }))
            }))
        })),
        auth: {
            getSession: vi.fn(),
            getUser: vi.fn(),
            refreshSession: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn((callback) => {
                authStateChangeHandler = callback
                return { data: { subscription: { unsubscribe: vi.fn() } } }
            }),
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
        authStateChangeHandler = null
        // Default mock implementation
        mockRoleAbortSignal.mockResolvedValue({ data: [], error: null })
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any)
        vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as any)
        vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
            data: { session: null },
            error: { message: 'invalid refresh token' }
        } as any)
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

        it('should preserve the local session while recovering from a network validation error', async () => {
            const localSession = {
                access_token: 'token-1',
                user: { id: 'user-1' }
            }

            vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: localSession }, error: null } as any)
            vi.mocked(validateSessionWithRetry).mockResolvedValue({
                valid: false,
                error: { type: 'network', message: 'timeout', retryable: true }
            })
            vi.mocked(supabase.from).mockReturnValue({
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        abortSignal: vi.fn().mockRejectedValue(new Error('network timeout'))
                    }))
                }))
            } as any)

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))

            expect(result.current.user?.id).toBe('user-1')
            expect(result.current.sessionStatus).toBe('recovering')
            expect(result.current.adminStatus).toBe('checking')
            expect(supabase.auth.signOut).not.toHaveBeenCalled()
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
        it('should enter recovery mode on getSession timeout without forcing sign out', async () => {
            vi.mocked(supabase.auth.getSession).mockImplementation(() => new Promise(() => { })) // Never resolves

            vi.useFakeTimers()

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })

            // Advance time by 5.1s
            await act(async () => {
                await vi.advanceTimersByTimeAsync(5100)
            })

            await act(async () => {
                await Promise.resolve()
            })

            expect(result.current.sessionStatus).toBe('recovering')
            expect(result.current.adminStatus).toBe('checking')
            expect(result.current.initialized).toBe(true)
            expect(supabase.auth.signOut).not.toHaveBeenCalled()

            vi.useRealTimers()
        }, 10000)
    })

    describe('validateSession method', () => {
        it('should accept TOKEN_REFRESHED for the same user without full revalidation fan-out', async () => {
            const localSession = {
                access_token: 'token-1',
                user: { id: 'user-1' }
            }
            const refreshedSession = {
                access_token: 'token-2',
                user: { id: 'user-1' }
            }

            vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: localSession }, error: null } as any)
            vi.mocked(validateSessionWithRetry).mockResolvedValue({
                valid: true,
                user: { id: 'user-1' },
                session: localSession
            } as any)
            mockRoleAbortSignal.mockResolvedValue({ data: [{ role_name: 'admin' }], error: null })

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))
            await waitFor(() => expect(result.current.session?.access_token).toBe('token-1'))

            vi.mocked(validateSessionWithRetry).mockClear()
            mockRoleAbortSignal.mockClear()

            await act(async () => {
                authStateChangeHandler?.('TOKEN_REFRESHED', refreshedSession)
            })

            expect(result.current.sessionStatus).toBe('ready')
            expect(validateSessionWithRetry).not.toHaveBeenCalled()
            expect(mockRoleAbortSignal).not.toHaveBeenCalled()
        })

        it('should sign out and reset auth state when SIGNED_IN validation is invalid and non-network', async () => {
            const initialSession = {
                access_token: 'token-1',
                user: { id: 'user-1' }
            }
            const signedInSession = {
                access_token: 'token-2',
                user: { id: 'user-2' }
            }

            vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: initialSession }, error: null } as any)
            vi.mocked(validateSessionWithRetry)
                .mockResolvedValueOnce({
                    valid: true,
                    user: { id: 'user-1' },
                    session: initialSession
                } as any)
                .mockResolvedValueOnce({
                    valid: false,
                    error: { type: 'expired', message: 'Expired', retryable: false }
                } as any)

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))

            vi.mocked(supabase.auth.signOut).mockClear()

            await act(async () => {
                authStateChangeHandler?.('SIGNED_IN', signedInSession)
            })

            await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled())
            await waitFor(() => expect(result.current.sessionStatus).toBe('expired'))
            expect(result.current.user).toBeNull()
            expect(result.current.adminStatus).toBe('denied')
        })

        it('should update state and return true on success', async () => {
            const localSession = {
                access_token: 'token-1',
                user: { id: 'user-1' }
            }
            const mockResult = {
                valid: true,
                user: { id: 'user-1' },
                session: localSession
            }
            vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: localSession }, error: null } as any)
            vi.mocked(validateSessionWithRetry).mockResolvedValue(mockResult as any)

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))

            let success = false
            await act(async () => {
                success = await result.current.validateSession()
            })

            expect(success).toBe(true)
            await waitFor(() => expect(result.current.user?.id).toBe('user-1'))
        })

        it('should return false and sign out on failure', async () => {
            const localSession = {
                access_token: 'token-expired',
                user: { id: 'user-1' }
            }
            vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: localSession }, error: null } as any)
            vi.mocked(validateSessionWithRetry).mockResolvedValue({
                valid: false,
                error: { type: 'expired', message: 'Expired', retryable: false }
            })

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))

            let success = true
            await act(async () => {
                success = await result.current.validateSession()
            })
            expect(success).toBe(false)
            expect(supabase.auth.signOut).toHaveBeenCalled()
        })

        it('should return a fresh access token from the shared auth contract', async () => {
            const localSession = {
                access_token: 'token-1',
                expires_at: Math.floor((Date.now() + 30_000) / 1000),
                user: { id: 'user-1' }
            }
            const refreshedSession = {
                access_token: 'token-2',
                expires_at: Math.floor((Date.now() + 3_600_000) / 1000),
                user: { id: 'user-1' }
            }

            vi.mocked(supabase.auth.getSession)
                .mockResolvedValueOnce({ data: { session: localSession }, error: null } as any)
                .mockResolvedValueOnce({ data: { session: localSession }, error: null } as any)
                .mockResolvedValueOnce({ data: { session: refreshedSession }, error: null } as any)
                .mockResolvedValueOnce({ data: { session: refreshedSession }, error: null } as any)
            vi.mocked(validateSessionWithRetry).mockResolvedValue({
                valid: true,
                user: { id: 'user-1' },
                session: refreshedSession
            } as any)

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))

            let token: string | null = null
            await act(async () => {
                token = await result.current.getValidAccessToken()
            })

            expect(token).toBe('token-2')
        })

        it('prefers the latest session snapshot even when the in-memory token still looks fresh', async () => {
            const localSession = {
                access_token: 'token-1',
                expires_at: Math.floor((Date.now() + 3_600_000) / 1000),
                user: { id: 'user-1' }
            }
            const refreshedSession = {
                access_token: 'token-2',
                expires_at: Math.floor((Date.now() + 3_600_000) / 1000),
                user: { id: 'user-1' }
            }

            vi.mocked(supabase.auth.getSession)
                .mockResolvedValueOnce({ data: { session: localSession }, error: null } as any)
                .mockResolvedValueOnce({ data: { session: refreshedSession }, error: null } as any)
            vi.mocked(validateSessionWithRetry).mockResolvedValue({
                valid: true,
                user: { id: 'user-1' },
                session: localSession
            } as any)

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))

            vi.mocked(validateSessionWithRetry).mockClear()

            let token: string | null = null
            await act(async () => {
                token = await result.current.getValidAccessToken()
            })

            expect(token).toBe('token-2')
            expect(validateSessionWithRetry).not.toHaveBeenCalled()
        })

        it('revalidates on token refresh when the user changes', async () => {
            const initialSession = {
                access_token: 'token-1',
                user: { id: 'user-1' }
            }
            const switchedSession = {
                access_token: 'token-2',
                user: { id: 'user-2' }
            }

            vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: initialSession }, error: null } as any)
            vi.mocked(validateSessionWithRetry)
                .mockResolvedValueOnce({
                    valid: true,
                    user: { id: 'user-1' },
                    session: initialSession
                } as any)
                .mockResolvedValueOnce({
                    valid: true,
                    user: { id: 'user-2' },
                    session: switchedSession
                } as any)

            const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider })
            await waitFor(() => expect(result.current.initialized).toBe(true))
            vi.mocked(validateSessionWithRetry).mockClear()

            await act(async () => {
                authStateChangeHandler?.('TOKEN_REFRESHED', switchedSession)
            })

            await waitFor(() => expect(validateSessionWithRetry).toHaveBeenCalled())
            expect(validateSessionWithRetry).toHaveBeenCalled()
        })
    })
})
