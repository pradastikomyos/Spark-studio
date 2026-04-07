type ErrorTrackingContext = {
  location?: string
  errorType?: string
  returnPath?: string
  hasBookingState?: boolean
  userId?: string
  stackTrace?: string
}

const trackingEnabled = String(import.meta.env.VITE_ERROR_TRACKING_ENABLED || '').toLowerCase() === 'true'

export function reportClientError(message: string, context?: ErrorTrackingContext) {
  if (!trackingEnabled) return
  if (typeof window === 'undefined') return

  if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('app:error', {
        detail: {
          message,
          context,
          timestamp: new Date().toISOString(),
        },
      })
    )
  }
}
