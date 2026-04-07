import { getAllowedAppOrigins } from './env.ts'

type CorsOptions = {
  allowAllOrigins?: boolean
}

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
}

function resolveAllowedOrigin(req: Request, options?: CorsOptions): string {
  if (options?.allowAllOrigins) return '*'

  const originRaw = req.headers.get('Origin') ?? req.headers.get('origin') ?? ''
  const origin = normalizeOrigin(originRaw)
  const configuredOrigins = getAllowedAppOrigins()

  if (!origin) return configuredOrigins[0] ?? '*'
  if (configuredOrigins.includes(origin)) return origin

  const hasOnlyLocalConfiguredOrigins =
    configuredOrigins.length > 0 && configuredOrigins.every((configuredOrigin) => isLocalOrigin(configuredOrigin))

  if (configuredOrigins.length === 0 || hasOnlyLocalConfiguredOrigins) {
    return origin
  }

  return 'null'
}

export function getCorsHeaders(req: Request, options?: CorsOptions): Record<string, string> {
  const requestedHeaders =
    req.headers.get('Access-Control-Request-Headers') ??
    req.headers.get('access-control-request-headers') ??
    'authorization, x-client-info, apikey, content-type'

  return {
    'Access-Control-Allow-Origin': resolveAllowedOrigin(req, options),
    'Access-Control-Allow-Headers': requestedHeaders,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin, Access-Control-Request-Headers',
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

export function jsonError(
  req: Request,
  status: number,
  data: string | Record<string, unknown>,
  options?: CorsOptions
): Response {
  const body = typeof data === 'string' ? { error: data } : data
  return json(req, body, { status }, options)
}

function shouldExposeErrorDetails(): boolean {
  const flag = (Deno.env.get('EXPOSE_ERROR_DETAILS') ?? '').toLowerCase()
  if (flag === 'true') return true
  const appEnv = (Deno.env.get('APP_ENV') ?? '').toLowerCase()
  return appEnv === 'development' || appEnv === 'local'
}

export function jsonErrorWithDetails(
  req: Request,
  status: number,
  data: { error: string; code?: string; details?: unknown },
  options?: CorsOptions
): Response {
  if (status < 500 || shouldExposeErrorDetails()) {
    return jsonError(req, status, data, options)
  }
  const { error, code } = data
  return jsonError(req, status, { error, ...(code ? { code } : {}) }, options)
}
