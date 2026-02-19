import { describe, it, expect, vi, afterEach } from 'vitest'
import { withTimeout } from './queryHelpers'

const flushPromises = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

describe('queryHelpers.withTimeout', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves when promise finishes before timeout', async () => {
    vi.useFakeTimers()

    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('ok'), 50)
    })

    const resultPromise = withTimeout(promise, 1000, 'timeout')
    const expectation = expect(resultPromise).resolves.toBe('ok')
    await vi.advanceTimersByTimeAsync(60)
    await flushPromises()

    await expectation
  })

  it('rejects with timeout error when deadline is exceeded', async () => {
    vi.useFakeTimers()

    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 1000)
    })

    const resultPromise = withTimeout(promise, 100, 'timeout')
    const expectation = expect(resultPromise).rejects.toThrow('timeout')
    await vi.advanceTimersByTimeAsync(150)
    await flushPromises()

    await expectation
  })
})
