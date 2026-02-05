import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import PaymentPage from './PaymentPage'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { hasBookingState, restoreBookingState, clearBookingState, preserveBookingState } from '../utils/bookingStateManager'

// Mock dependencies
vi.mock('../contexts/AuthContext', () => ({
    useAuth: vi.fn()
}))

vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
            getSession: vi.fn(),
            signOut: vi.fn(),
        }
    }
}))

vi.mock('../utils/midtransSnap', () => ({
    loadSnapScript: vi.fn().mockResolvedValue({})
}))

vi.mock('../utils/bookingStateManager', () => ({
    hasBookingState: vi.fn(),
    restoreBookingState: vi.fn(),
    clearBookingState: vi.fn(),
    preserveBookingState: vi.fn()
}))

// Mock react-router-dom hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: vi.fn()
    }
})

describe('PaymentPage', () => {
    const mockUser = { email: 'test@example.com' }
    const mockBookingState = {
        ticketId: 1,
        ticketName: 'Test Ticket',
        ticketType: 'entrance',
        price: 50000,
        date: '2026-02-01',
        time: '10:00',
        quantity: 1,
        total: 50000
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useAuth).mockReturnValue({
            user: mockUser,
        } as any)
        vi.mocked(useLocation).mockReturnValue({
            state: mockBookingState,
            pathname: '/payment'
        } as any)
        vi.mocked(hasBookingState).mockReturnValue(false)
        vi.mocked(supabase.auth.getUser).mockResolvedValue({
            data: { user: mockUser },
            error: null
        } as any)
        vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: { session: { access_token: 'valid' } }
        } as any)
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ token: 'snap-token', order_id: '123', order_number: 'ORD-123' })
        }) as any
    })

    describe('Task 4.1: Pre-flight session validation', () => {
        it('should validate session with supabase.auth.getUser before processing payment', async () => {
            render(<MemoryRouter><PaymentPage /></MemoryRouter>)

            const payButton = await screen.findByRole('button', { name: /Pay/i })
            fireEvent.click(payButton)

            await waitFor(() => expect(supabase.auth.getUser).toHaveBeenCalled())
        })
    })

    describe('Task 4.3: State preservation on 401 errors', () => {
        it('should preserve state and navigate to login on session expiry', async () => {
            vi.mocked(supabase.auth.getUser).mockResolvedValue({
                data: { user: null },
                error: { status: 401, message: 'Unauthorized' }
            } as any)

            render(<MemoryRouter><PaymentPage /></MemoryRouter>)

            const payButton = await screen.findByRole('button', { name: /Pay/i })
            fireEvent.click(payButton)

            await waitFor(() => {
                expect(preserveBookingState).toHaveBeenCalled()
                expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({
                    state: expect.objectContaining({ returnTo: '/payment' })
                }))
            })
        })
    })

    describe('State Restoration', () => {
        it('should restore state if location.state is missing but backup exists', async () => {
            vi.mocked(useLocation).mockReturnValue({
                state: null,
                pathname: '/payment'
            } as any)
            vi.mocked(hasBookingState).mockReturnValue(true)
            vi.mocked(restoreBookingState).mockReturnValue(mockBookingState as any)

            render(<MemoryRouter><PaymentPage /></MemoryRouter>)

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/payment', expect.objectContaining({
                    state: mockBookingState
                }))
            })
        })
    })

    describe('Task 4.4: Auto-logout on 401', () => {
        it('should sign out when edge function returns 401', async () => {
            vi.mocked(supabase.auth.getSession).mockResolvedValue({
                data: { session: { access_token: 'token' } }
            } as any)

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' })
            })

            render(<MemoryRouter><PaymentPage /></MemoryRouter>)

            const payButton = await screen.findByRole('button', { name: /Pay/i })
            fireEvent.click(payButton)

            await waitFor(() => {
                expect(supabase.auth.signOut).toHaveBeenCalled()
                expect(mockNavigate).toHaveBeenCalledWith('/login', expect.anything())
            })
        })
    })

    describe('Payment Success', () => {
        it('should clear booking state on success', async () => {
            vi.mocked(supabase.auth.getSession).mockResolvedValue({
                data: { session: { access_token: 'token' } }
            } as any)

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ token: 'snap-token', order_id: '123', order_number: 'ORD-123' })
            }) as any

            // Mock window.snap.pay
            const mockSnapPay = vi.fn().mockImplementation((_token, callbacks) => {
                callbacks.onSuccess({ status_code: '200' })
            })
            global.window.snap = { pay: mockSnapPay } as any

            render(<MemoryRouter><PaymentPage /></MemoryRouter>)

            // Wait for snap script load
            await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull())

            const payButton = await screen.findByRole('button', { name: /Pay/i })
            fireEvent.click(payButton)

            await waitFor(() => {
                expect(clearBookingState).toHaveBeenCalled()
                expect(mockNavigate).toHaveBeenCalledWith('/booking-success', expect.anything())
            })
        })

        it('should pass isPending: true flag on success navigation', async () => {
            vi.mocked(supabase.auth.getSession).mockResolvedValue({
                data: { session: { access_token: 'token' } }
            } as any)

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ token: 'snap-token', order_id: '123', order_number: 'ORD-123' })
            }) as any

            // Mock window.snap.pay
            const mockSnapPay = vi.fn().mockImplementation((_token, callbacks) => {
                callbacks.onSuccess({ status_code: '200' })
            })
            global.window.snap = { pay: mockSnapPay } as any

            render(<MemoryRouter><PaymentPage /></MemoryRouter>)

            // Wait for snap script load
            await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull())

            const payButton = await screen.findByRole('button', { name: /Pay/i })
            fireEvent.click(payButton)

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/booking-success', 
                    expect.objectContaining({
                        state: expect.objectContaining({
                            isPending: true
                        })
                    })
                )
            })
        })
    })
})
