import { describe, expect, it } from 'vitest'
import { getOrderStatusPresentation, mapMidtransStatus } from './midtransStatus'

describe('mapMidtransStatus', () => {
  it('maps settlement to paid', () => {
    expect(mapMidtransStatus('settlement', 'accept')).toBe('paid')
  })

  it('maps capture + accept to paid', () => {
    expect(mapMidtransStatus('capture', 'accept')).toBe('paid')
  })

  it('maps capture + challenge to pending', () => {
    expect(mapMidtransStatus('capture', 'challenge')).toBe('pending')
  })

  it('maps pending to pending', () => {
    expect(mapMidtransStatus('pending', null)).toBe('pending')
  })

  it('maps deny/cancel/failure to failed', () => {
    expect(mapMidtransStatus('deny', null)).toBe('failed')
    expect(mapMidtransStatus('cancel', null)).toBe('failed')
    expect(mapMidtransStatus('failure', null)).toBe('failed')
  })

  it('maps expire to expired', () => {
    expect(mapMidtransStatus('expire', null)).toBe('expired')
  })

  it('maps refund variants to refunded', () => {
    expect(mapMidtransStatus('refund', null)).toBe('refunded')
    expect(mapMidtransStatus('partial_refund', null)).toBe('refunded')
  })
})

describe('getOrderStatusPresentation', () => {
  it('returns pending presentation', () => {
    const p = getOrderStatusPresentation('pending')
    expect(p.icon).toBe('schedule')
    expect(p.title).toBe('Payment Pending')
  })

  it('defaults to thank you for unknown', () => {
    const p = getOrderStatusPresentation('unknown')
    expect(p.title).toBe('Thank You!')
  })
})

