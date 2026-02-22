import { getPublicAppUrl } from './env.ts'

type CorsOptions = {
  allowAllOrigins?: boolean
}

export function getCorsHeaders(req: Request, options?: CorsOptions): Record<string, string> {
  const allowAllOrigins = options?.allowAllOrigins ?? false
  const publicAppUrl = getPublicAppUrl()
  const originRaw = req.headers.get('Origin') ?? req.headers.get('origin') ?? ''
  const origin = originRaw.replace(/\/+$/, '')

  let allowedOrigin = publicAppUrl ? publicAppUrl : 'null'
  if (allowAllOrigins) {
    allowedOrigin = '*'
  } else if (origin && publicAppUrl && origin === publicAppUrl) {
    allowedOrigin = origin
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
}

export function handleCors(req: Request, options?: CorsOptions): Response | null {
  if (req.method !== 'OPTIONS') return null
  return new Response('ok', { headers: getCorsHeaders(req, options) })
}

export function json(req: Request, data: unknown, init?: ResponseInit, options?: CorsOptions): Response {
  const baseHeaders = { ...getCorsHeaders(req, options), 'Content-Type': 'application/json' }
  const headers = init?.headers ? { ...baseHeaders, ...(init.headers as Record<string, string>) } : baseHeaders
  return new Response(JSON.stringify(data), { ...init, headers })
}
