import { getSupabaseEnv } from './env.ts'
import { json } from './http.ts'
import { getUserFromAuthHeader } from './supabase.ts'

export type AuthenticatedRequestContext = {
  supabaseEnv: ReturnType<typeof getSupabaseEnv>
  user: {
    id: string
    email?: string | null
  }
}

type AuthOptions = {
  requireEmail?: boolean
}

function getAuthErrorMessage(authError: unknown): string | null {
  if (!authError || typeof authError !== 'object') return null
  const message = (authError as { message?: unknown }).message
  return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null
}

function buildUnauthorizedResponse(
  req: Request,
  authError?: unknown,
  options?: AuthOptions
) {
  const fallbackMessage = options?.requireEmail
    ? 'Authenticated user is missing required email claim'
    : 'Invalid or expired session'
  const message = getAuthErrorMessage(authError) ?? fallbackMessage
  const isExpired = message.toLowerCase().includes('expired')

  return json(
    req,
    {
      error: isExpired ? 'Session Expired' : 'Unauthorized',
      code: isExpired ? 'SESSION_EXPIRED' : 'INVALID_TOKEN',
      message,
    },
    { status: 401 }
  )
}

export async function requireAuthenticatedRequest(
  req: Request,
  options?: AuthOptions
): Promise<{ context?: AuthenticatedRequestContext; response?: Response }> {
  const supabaseEnv = getSupabaseEnv()
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')

  if (!authHeader) {
    return {
      response: json(req, { error: 'Missing authorization header' }, { status: 401 }),
    }
  }

  const { user, error: authError } = await getUserFromAuthHeader({
    url: supabaseEnv.url,
    anonKey: supabaseEnv.anonKey,
    authHeader,
  })

  if (authError || !user?.id) {
    return {
      response: buildUnauthorizedResponse(req, authError),
    }
  }

  if (options?.requireEmail && !user.email) {
    return {
      response: buildUnauthorizedResponse(req, { message: 'Authenticated user is missing required email claim' }, options),
    }
  }

  return {
    context: {
      supabaseEnv,
      user: {
        id: user.id,
        email: user.email,
      },
    },
  }
}
