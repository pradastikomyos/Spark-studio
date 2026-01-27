import { vi } from 'vitest'

/**
 * Creates a mock Supabase client with auth and database methods
 */
export function createMockSupabase() {
    return {
        auth: {
            getSession: vi.fn(),
            getUser: vi.fn(),
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockReturnThis()
        })),
        functions: {
            invoke: vi.fn()
        }
    }
}

/**
 * Standardized mock session data
 */
export const mockSession = {
    access_token: 'valid-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: { name: 'Test User' },
        aud: 'authenticated',
        created_at: new Date().toISOString()
    }
}
