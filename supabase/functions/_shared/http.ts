export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export function handleCors(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null
  return new Response('ok', { headers: corsHeaders })
}

export function json(data: unknown, init?: ResponseInit): Response {
  const baseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }
  const headers = init?.headers ? { ...baseHeaders, ...(init.headers as Record<string, string>) } : baseHeaders
  return new Response(JSON.stringify(data), { ...init, headers })
}
