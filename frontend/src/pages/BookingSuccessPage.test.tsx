import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import BookingSuccessPage from './BookingSuccessPage'
import * as AuthContext from '../contexts/AuthContext'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))
vi.mock('react-qr-code', () => ({ default: () => null }))

vi.mock('../utils/queryHelpers', () => ({
  withTimeout: () => new Promise(() => {})
}))

vi.mock('../lib/supabase', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(new Promise(() => {})),
  }

  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } }
        }))
      },
      from: vi.fn(() => chain),
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn()
      })),
      removeChannel: vi.fn(),
      functions: {
        invoke: vi.fn()
      }
    }
  }
})

const mockValidateSession = vi.fn()

vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
  user: null,
  session: null,
  initialized: true,
  sessionStatus: 'ready',
  adminStatus: 'denied',
  isAdmin: false,
  loggingOut: false,
  validateSession: mockValidateSession,
  refreshSession: vi.fn(),
  getValidAccessToken: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn()
})

describe('BookingSuccessPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockValidateSession.mockResolvedValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows retry loading after skeleton timeout', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/booking-success', state: { orderNumber: 'ORD-1', isPending: true } }]}>
        <Routes>
          <Route path="/booking-success" element={<BookingSuccessPage />} />
        </Routes>
      </MemoryRouter>
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20050)
    })

    expect(screen.getByText('Retry Loading')).toBeTruthy()
  })
})
