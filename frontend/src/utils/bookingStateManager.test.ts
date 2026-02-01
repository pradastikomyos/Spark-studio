import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import {
  preserveBookingState,
  restoreBookingState,
  clearBookingState,
  hasBookingState,
  getBookingStateAge,
  type BookingState
} from './bookingStateManager'
import { bookingStateArb, staleTimestampArb } from '@/test/generators'

describe('Feature: session-expiry-fix', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  describe('Property 6: Booking State Round Trip', () => {
    it('should preserve and restore booking state within staleness window', () => {
      fc.assert(
        fc.property(bookingStateArb, (bookingState: Omit<BookingState, 'timestamp'>) => {
          // Preserve the booking state
          preserveBookingState(bookingState)

          // Restore the booking state
          const restored = restoreBookingState()

          // Should successfully restore
          expect(restored).not.toBeNull()

          if (restored) {
            // All fields should match (except timestamp which is added)
            expect(restored.ticketId).toBe(bookingState.ticketId)
            expect(restored.ticketName).toBe(bookingState.ticketName)
            expect(restored.ticketType).toBe(bookingState.ticketType)
            expect(restored.price).toBe(bookingState.price)
            expect(restored.date).toBe(bookingState.date)
            expect(restored.time).toBe(bookingState.time)
            expect(restored.quantity).toBe(bookingState.quantity)
            expect(restored.total).toBe(bookingState.total)

            // Timestamp should be recent (within last second)
            const age = Date.now() - restored.timestamp
            expect(age).toBeLessThan(1000)
            expect(age).toBeGreaterThanOrEqual(0)
          }

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should return null for stale booking state (>30 minutes)', () => {
      fc.assert(
        fc.property(bookingStateArb, staleTimestampArb, (bookingState: Omit<BookingState, 'timestamp'>, staleTimestamp: number) => {
          // Manually create stale state in sessionStorage
          const staleState: BookingState = {
            ...bookingState,
            timestamp: staleTimestamp
          }

          sessionStorage.setItem('booking_state', JSON.stringify(staleState))

          // Attempt to restore
          const restored = restoreBookingState()

          // Should return null for stale state
          expect(restored).toBeNull()

          // Should also clear the stale state
          expect(hasBookingState()).toBe(false)

          return true
        }),
        { numRuns: 100 }
      )
    })

    it('should handle invalid JSON gracefully', () => {
      // Set invalid JSON
      sessionStorage.setItem('booking_state', 'invalid json {')

      const restored = restoreBookingState()

      // Should return null
      expect(restored).toBeNull()

      // Should clear the invalid state
      expect(hasBookingState()).toBe(false)
    })

    it('should handle missing required fields', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'ticketId',
            'ticketName',
            'ticketType',
            'price',
            'date',
            'time',
            'quantity',
            'total',
            'timestamp'
          ),
          bookingStateArb,
          (fieldToRemove: string, bookingState: Omit<BookingState, 'timestamp'>) => {
            // Create state with missing field
            const incompleteState: any = { ...bookingState, timestamp: Date.now() }
            delete incompleteState[fieldToRemove]

            sessionStorage.setItem('booking_state', JSON.stringify(incompleteState))

            // Attempt to restore
            const restored = restoreBookingState()

            // Should return null for incomplete state
            expect(restored).toBeNull()

            // Should clear the invalid state
            expect(hasBookingState()).toBe(false)

            return true
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('Property 7: Booking State Serialization Completeness', () => {
    it('should serialize all required fields to sessionStorage', () => {
      fc.assert(
        fc.property(bookingStateArb, (bookingState: Omit<BookingState, 'timestamp'>) => {
          // Preserve the booking state
          preserveBookingState(bookingState)

          // Get the raw stored value
          const stored = sessionStorage.getItem('booking_state')
          expect(stored).not.toBeNull()

          if (stored) {
            const parsed = JSON.parse(stored)

            // Verify all required fields are present
            expect(parsed).toHaveProperty('ticketId')
            expect(parsed).toHaveProperty('ticketName')
            expect(parsed).toHaveProperty('ticketType')
            expect(parsed).toHaveProperty('price')
            expect(parsed).toHaveProperty('date')
            expect(parsed).toHaveProperty('time')
            expect(parsed).toHaveProperty('quantity')
            expect(parsed).toHaveProperty('total')
            expect(parsed).toHaveProperty('timestamp')

            // Verify field types
            expect(typeof parsed.ticketId).toBe('number')
            expect(typeof parsed.ticketName).toBe('string')
            expect(typeof parsed.ticketType).toBe('string')
            expect(typeof parsed.price).toBe('number')
            expect(typeof parsed.date).toBe('string')
            expect(typeof parsed.time).toBe('string')
            expect(typeof parsed.quantity).toBe('number')
            expect(typeof parsed.total).toBe('number')
            expect(typeof parsed.timestamp).toBe('number')

            // Verify values match
            expect(parsed.ticketId).toBe(bookingState.ticketId)
            expect(parsed.ticketName).toBe(bookingState.ticketName)
            expect(parsed.ticketType).toBe(bookingState.ticketType)
            expect(parsed.price).toBe(bookingState.price)
            expect(parsed.date).toBe(bookingState.date)
            expect(parsed.time).toBe(bookingState.time)
            expect(parsed.quantity).toBe(bookingState.quantity)
            expect(parsed.total).toBe(bookingState.total)
          }

          return true
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Utility functions', () => {
    it('should correctly report booking state existence', () => {
      expect(hasBookingState()).toBe(false)

      preserveBookingState({
        ticketId: 1,
        ticketName: 'Test Ticket',
        ticketType: 'entrance',
        price: 50000,
        date: '2026-02-01',
        time: '10:00',
        quantity: 2,
        total: 100000
      })

      expect(hasBookingState()).toBe(true)

      clearBookingState()

      expect(hasBookingState()).toBe(false)
    })

    it('should correctly calculate booking state age', () => {
      expect(getBookingStateAge()).toBeNull()

      preserveBookingState({
        ticketId: 1,
        ticketName: 'Test Ticket',
        ticketType: 'entrance',
        price: 50000,
        date: '2026-02-01',
        time: '10:00',
        quantity: 2,
        total: 100000
      })

      const age = getBookingStateAge()
      expect(age).not.toBeNull()
      expect(age).toBeGreaterThanOrEqual(0)
      expect(age).toBeLessThan(1000) // Should be very recent
    })

    it('should clear booking state', () => {
      preserveBookingState({
        ticketId: 1,
        ticketName: 'Test Ticket',
        ticketType: 'entrance',
        price: 50000,
        date: '2026-02-01',
        time: '10:00',
        quantity: 2,
        total: 100000
      })

      expect(hasBookingState()).toBe(true)

      clearBookingState()

      expect(hasBookingState()).toBe(false)
      expect(restoreBookingState()).toBeNull()
    })
  })
})
