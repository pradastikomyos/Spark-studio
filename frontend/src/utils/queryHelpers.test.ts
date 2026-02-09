import { describe, it, expect, vi, afterEach } from 'vitest'
import { withTimeout } from './queryHelpers'

const flushPromises = () => new Promise((resolve) => queueMicrotask(resolve))

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
    await vi.advanceTimersByTimeAsync(60)
    await flushPromises()

    await expect(resultPromise).resolves.toBe('ok')
  })

  it('rejects with timeout error when deadline is exceeded', async () => {
    vi.useFakeTimers()

    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 1000)
    })

    const resultPromise = withTimeout(promise, 100, 'timeout')
    await vi.advanceTimersByTimeAsync(150)
    await flushPromises()

    await expect(resultPromise).rejects.toThrow('timeout')
  })
})
