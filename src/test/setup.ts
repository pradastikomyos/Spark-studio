import { vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// Mock matchMedia FIRST (before any other setup) for Framer Motion compatibility
const matchMediaMock = (query: string): MediaQueryList => {
  const listeners: Array<(event: MediaQueryListEvent) => void> = []
  
  return {
    matches: false,
    media: query,
    onchange: null,
    // Modern API
    addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.push(handler)
      }
    }),
    removeEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const index = listeners.indexOf(handler)
        if (index > -1) {
          listeners.splice(index, 1)
        }
      }
    }),
    // Deprecated API (for Framer Motion compatibility)
    addListener: vi.fn((handler: (event: MediaQueryListEvent) => void) => {
      listeners.push(handler)
    }),
    removeListener: vi.fn((handler: (event: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(handler)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }),
    dispatchEvent: vi.fn(() => true),
  } as MediaQueryList
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(matchMediaMock),
})

// Configure fast-check global settings
fc.configureGlobal({ numRuns: 100 })

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})

// Reset mocks before each test
beforeEach(() => {
  sessionStorageMock.clear()
  localStorageMock.clear()
  vi.clearAllMocks()
  cleanup()
})
