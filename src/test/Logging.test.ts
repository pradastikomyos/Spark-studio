import { describe, it, expect, vi } from 'vitest'
import { createErrorLog, logError } from '../utils/sessionErrorHandler'

describe('Logging System', () => {
    it('should create a correctly structured error log', () => {
        const log = createErrorLog(
            'session_expired',
            '/payment',
            'Unauthorized',
            { hasBookingState: true, returnPath: '/payment' },
            'user-123'
        )

        expect(log.errorType).toBe('session_expired')
        expect(log.location).toBe('/payment')
        expect(log.errorMessage).toBe('Unauthorized')
        expect(log.userId).toBe('user-123')
        expect(log.context.hasBookingState).toBe(true)
        expect(log.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should log to console.error', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        const log = createErrorLog(
            'network',
            '/home',
            'Fetch failed',
            { hasBookingState: false }
        )

        logError(log)

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Session Error Log:'), log)
        consoleSpy.mockRestore()
    })
})
