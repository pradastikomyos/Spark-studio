export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded'

export function mapMidtransStatus(
  transactionStatus: unknown,
  fraudStatus: unknown
): OrderStatus {
  const tx = String(transactionStatus || '').toLowerCase()
  const fraud = fraudStatus == null ? null : String(fraudStatus).toLowerCase()

  if (tx === 'capture') {
    if (fraud === 'accept' || fraud == null) return 'paid'
    return 'pending'
  }

  if (tx === 'settlement') return 'paid'
  if (tx === 'pending') return 'pending'
  if (tx === 'expire' || tx === 'expired') return 'expired'
  if (tx === 'refund' || tx === 'refunded' || tx === 'partial_refund') return 'refunded'
  if (tx === 'deny' || tx === 'cancel' || tx === 'failure') return 'failed'

  return 'pending'
}

export function getOrderStatusPresentation(status: unknown): {
  icon: string
  title: string
  description: string
} {
  const s = status == null ? null : String(status).toLowerCase()

  if (s === 'pending') {
    return {
      icon: 'schedule',
      title: 'Payment Pending',
      description: 'This page will update automatically once payment is confirmed.',
    }
  }

  if (s === 'paid') {
    return {
      icon: 'check_circle',
      title: 'Ready to Be a Star?',
      description: 'Your stage awaits. Let the magic begin.',
    }
  }

  if (s === 'failed') {
    return {
      icon: 'error',
      title: 'Payment Failed',
      description: 'Your payment was not completed. Please try again.',
    }
  }

  if (s === 'expired') {
    return {
      icon: 'event_busy',
      title: 'Payment Expired',
      description: 'Your payment window has expired. Please place a new order.',
    }
  }

  if (s === 'refunded') {
    return {
      icon: 'replay',
      title: 'Payment Refunded',
      description: 'Your payment has been refunded.',
    }
  }

  return {
    icon: 'check_circle',
    title: 'Thank You!',
    description: 'Your session is locked in. We can\'t wait to see your vision come to life at Spark Stage.',
  }
}

