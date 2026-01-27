/**
 * Booking state interface for preservation during session expiry
 */
export interface BookingState {
  ticketId: number
  ticketName: string
  ticketType: string
  price: number
  date: string
  time: string
  quantity: number
  total: number
  timestamp: number // For staleness check
}

const BOOKING_STATE_KEY = 'booking_state'
const MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Preserves booking state to sessionStorage with timestamp
 * @param state The booking state to preserve
 */
export function preserveBookingState(state: Omit<BookingState, 'timestamp'>): void {
  const stateWithTimestamp: BookingState = {
    ...state,
    timestamp: Date.now()
  }

  try {
    sessionStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateWithTimestamp))
    console.log('Booking state preserved:', {
      ticketId: state.ticketId,
      timestamp: new Date(stateWithTimestamp.timestamp).toISOString()
    })
  } catch (error) {
    console.error('Failed to preserve booking state:', error)
  }
}

/**
 * Restores booking state from sessionStorage
 * @returns BookingState if valid and not stale, null otherwise
 */
export function restoreBookingState(): BookingState | null {
  try {
    const stored = sessionStorage.getItem(BOOKING_STATE_KEY)
    if (!stored) {
      return null
    }

    const state = JSON.parse(stored) as BookingState

    // Validate required fields
    if (!isValidBookingState(state)) {
      console.warn('Invalid booking state structure, clearing')
      clearBookingState()
      return null
    }

    // Check if state is stale (older than 30 minutes)
    if (Date.now() - state.timestamp > MAX_AGE_MS) {
      console.warn('Booking state is stale, clearing')
      clearBookingState()
      return null
    }

    console.log('Booking state restored:', {
      ticketId: state.ticketId,
      age: Math.round((Date.now() - state.timestamp) / 1000) + 's'
    })

    return state
  } catch (error) {
    console.error('Failed to restore booking state:', error)
    clearBookingState()
    return null
  }
}

/**
 * Clears booking state from sessionStorage
 */
export function clearBookingState(): void {
  try {
    sessionStorage.removeItem(BOOKING_STATE_KEY)
    console.log('Booking state cleared')
  } catch (error) {
    console.error('Failed to clear booking state:', error)
  }
}

/**
 * Validates that a booking state has all required fields
 */
function isValidBookingState(state: unknown): state is BookingState {
  if (!state || typeof state !== 'object') {
    return false
  }

  const s = state as Record<string, unknown>

  return (
    typeof s.ticketId === 'number' &&
    typeof s.ticketName === 'string' &&
    typeof s.ticketType === 'string' &&
    typeof s.price === 'number' &&
    typeof s.date === 'string' &&
    typeof s.time === 'string' &&
    typeof s.quantity === 'number' &&
    typeof s.total === 'number' &&
    typeof s.timestamp === 'number'
  )
}

/**
 * Checks if booking state exists in sessionStorage
 */
export function hasBookingState(): boolean {
  try {
    return sessionStorage.getItem(BOOKING_STATE_KEY) !== null
  } catch {
    return false
  }
}

/**
 * Gets the age of the stored booking state in milliseconds
 * @returns Age in milliseconds, or null if no state exists
 */
export function getBookingStateAge(): number | null {
  try {
    const stored = sessionStorage.getItem(BOOKING_STATE_KEY)
    if (!stored) {
      return null
    }

    const state = JSON.parse(stored) as BookingState
    if (typeof state.timestamp !== 'number') {
      return null
    }

    return Date.now() - state.timestamp
  } catch {
    return null
  }
}
