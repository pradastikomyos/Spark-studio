import fc from 'fast-check'
import type { BookingState } from '@/utils/bookingStateManager'

/**
 * Generator for JWT tokens (random strings)
 */
export const jwtTokenArb = fc.string({ minLength: 100, maxLength: 200 })

/**
 * Generator for booking states
 */
export const bookingStateArb = fc.record({
  ticketId: fc.integer({ min: 1, max: 1000 }),
  ticketName: fc.string({ minLength: 5, maxLength: 50 }),
  ticketType: fc.constantFrom('entrance', 'workshop', 'event'),
  price: fc.integer({ min: 10000, max: 1000000 }),
  date: fc.integer({
    min: Date.now(),
    max: Date.now() + 90 * 24 * 60 * 60 * 1000
  }).map(timestamp => new Date(timestamp).toISOString().split('T')[0]),
  time: fc.constantFrom('09:00', '11:00', '13:00', '15:00', '17:00', 'all-day'),
  quantity: fc.integer({ min: 1, max: 10 }),
  total: fc.integer({ min: 10000, max: 10000000 })
}) as fc.Arbitrary<Omit<BookingState, 'timestamp'>>

/**
 * Generator for session states
 */
export const sessionStateArb = fc.record({
  hasToken: fc.boolean(),
  hasServerSession: fc.boolean(),
  sessionExpired: fc.boolean(),
  tokenValid: fc.boolean()
})

/**
 * Generator for network error patterns
 */
export const networkErrorArb = fc.record({
  failCount: fc.integer({ min: 0, max: 5 }),
  errorType: fc.constantFrom('timeout', 'connection', 'dns', 'fetch'),
  succeedOnRetry: fc.integer({ min: 0, max: 3 })
})

/**
 * Generator for retry scenarios
 */
export const retryScenarioArb = fc.record({
  maxRetries: fc.integer({ min: 1, max: 5 }),
  failuresBeforeSuccess: fc.integer({ min: 0, max: 4 }),
  errorType: fc.constantFrom('network', 'timeout', 'fetch')
})

/**
 * Generator for timestamps (within last 60 minutes)
 */
export const recentTimestampArb = fc.integer({
  min: Date.now() - 60 * 60 * 1000,
  max: Date.now()
})

/**
 * Generator for stale timestamps (older than 30 minutes)
 */
export const staleTimestampArb = fc.integer({
  min: Date.now() - 90 * 60 * 1000,
  max: Date.now() - 31 * 60 * 1000
})

/**
 * Generator for fresh timestamps (within last 30 minutes)
 */
export const freshTimestampArb = fc.integer({
  min: Date.now() - 29 * 60 * 1000,
  max: Date.now()
})
/**
 * Generator for validation results
 */
export const validationResultArb = fc.oneof(
  fc.record({
    valid: fc.constant(true),
    user: fc.record({ id: fc.uuid(), email: fc.emailAddress() }),
    session: fc.record({ access_token: jwtTokenArb, expires_at: fc.integer() })
  }),
  fc.record({
    valid: fc.constant(false),
    error: fc.record({
      type: fc.constantFrom('expired', 'invalid', 'network'),
      message: fc.string(),
      retryable: fc.boolean()
    })
  })
) as fc.Arbitrary<any>
