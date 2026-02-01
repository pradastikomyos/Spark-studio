import { createClient } from './deps.ts'

export function createServiceClient(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey)
}

export function createAuthClient(url: string, anonKey: string, authHeader: string) {
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  })
}

export async function getUserFromAuthHeader(params: { url: string; anonKey: string; authHeader: string }) {
  const supabaseAuth = createAuthClient(params.url, params.anonKey, params.authHeader)
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser()
  return { user, error }
}
