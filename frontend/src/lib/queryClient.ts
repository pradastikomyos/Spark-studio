import { QueryClient } from '@tanstack/react-query'

const DEFAULT_QUERY_STALE_TIME_MS = 30 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error: unknown) => {
        const status = typeof error === 'object' && error !== null && 'status' in error ? (error as { status?: number }).status : undefined
        if (status === 404) return false
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => 1000 * Math.pow(2, attemptIndex),
      staleTime: DEFAULT_QUERY_STALE_TIME_MS,
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
})
