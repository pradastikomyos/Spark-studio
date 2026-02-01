import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PaymentPage from '../pages/PaymentPage'
import { supabase } from '../lib/supabase'
import { hasBookingState, restoreBookingState } from '../utils/bookingStateManager'
import * as AuthContext from '../contexts/AuthContext'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            getUser: vi.fn(),
            signOut: vi.fn(),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis()
        }))
    }
}))

// Mock Booking State Manager
vi.mock('../utils/bookingStateManager', () => ({
    hasBookingState: vi.fn(),
    restoreBookingState: vi.fn(),
    clearBookingState: vi.fn(),
    preserveBookingState: vi.fn()
}))

// Mock loadSnapScript
vi.mock('../utils/midtransSnap', () => ({
    loadSnapScript: vi.fn(() => Promise.resolve())
}))

// Mock useAuth hook
const mockValidateSession = vi.fn()
const mockRefreshSession = vi.fn()
vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: { id: 'user-1', email: 'test@example.com', user_metadata: {}, app_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() },
    session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', user: null as any },
    isAdmin: false,
    initialized: true,
    loggingOut: false,
    validateSession: mockValidateSession,
    refreshSession: mockRefreshSession,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn()
})


const mockBookingState = {
    ticketId: 123,
    ticketName: 'Spark Entry',
    price: 150000,
    date: '2026-02-01',
    time: '09:00',
    quantity: 1,
    total: 150000
}

describe('Full Integration Flow: Session Expiry & Recovery', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        window.alert = vi.fn()
        mockValidateSession.mockResolvedValue(true)
    })

    it.skip('should handle the full flow: 401 Error -> Alert -> Redirect -> State Restoration', async () => {
        // 1. Initial State: User is on PaymentPage with state
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: { session: { user: { id: 'user-1' } } as any },
            error: null
        })
        vi.mocked(supabase.auth.getUser).mockResolvedValue({
            data: { user: { id: 'user-1' } as any },
            error: null
        })

        // Mock fetch for Edge Function returning 401
        global.fetch = vi.fn().mockResolvedValue({
            status: 401,
            json: async () => ({ error: 'Session Expired', code: 'SESSION_EXPIRED' })
        })

        render(
            <MemoryRouter initialEntries={[{ pathname: '/payment', state: mockBookingState }]}>
                <Routes>
                    <Route path="/payment" element={<PaymentPage />} />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        )

        // 2. Wait for component to load and verify payment page is shown
        expect(await screen.findByText(/Payment Confirmation/i)).toBeTruthy()
        expect(await screen.findByPlaceholderText(/Full Name/i)).toBeTruthy()

        // Set customer name
        const nameInput = screen.getByPlaceholderText(/Full Name/i)
        fireEvent.change(nameInput, { target: { value: 'John Doe' } })

        // Find and click any button with "IDR" in it (the pay button)
        const payButton = await screen.findByText(/IDR/i)
        fireEvent.click(payButton)

        // 3. Verify Alert and Navigation
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('session'))
            expect(screen.getByText('Login Page')).toBeTruthy()
        })
        consoleSpy.mockRestore()

        // 4. Simulate return from Login (State Restoration)
        vi.mocked(hasBookingState).mockReturnValue(true)
        vi.mocked(restoreBookingState).mockReturnValue(mockBookingState as any)

        render(
            <MemoryRouter initialEntries={['/payment']}>
                <Routes>
                    <Route path="/payment" element={<PaymentPage />} />
                </Routes>
            </MemoryRouter>
        )

        // 5. Verify state was restored
        expect(await screen.findByText(/Spark Entry/i)).toBeTruthy()
    })
})
