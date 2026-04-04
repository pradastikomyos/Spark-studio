export type PostAuthRedirect = {
  returnTo: string
  returnState?: unknown
}

const POST_AUTH_REDIRECT_STORAGE_KEY = 'auth:post-auth-redirect'

function normalizeReturnTo(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  if (!normalized.startsWith('/') || normalized.startsWith('//')) return null
  return normalized
}

export function sanitizePostAuthRedirect(value: unknown): PostAuthRedirect | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as { returnTo?: unknown; returnState?: unknown }
  const returnTo = normalizeReturnTo(candidate.returnTo)
  if (!returnTo) return null

  return {
    returnTo,
    returnState: candidate.returnState,
  }
}

export function persistPostAuthRedirect(value: unknown) {
  if (typeof window === 'undefined') return

  const redirect = sanitizePostAuthRedirect(value)
  if (!redirect) {
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, JSON.stringify(redirect))
}

export function readPostAuthRedirect(): PostAuthRedirect | null {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY)
  if (!raw) return null

  try {
    return sanitizePostAuthRedirect(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearPostAuthRedirect() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY)
}

export function consumePostAuthRedirect(): PostAuthRedirect | null {
  const redirect = readPostAuthRedirect()
  clearPostAuthRedirect()
  return redirect
}
