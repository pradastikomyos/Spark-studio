import { createClient, type SupabaseClient } from './deps.ts'
import type { Database } from './database.types.ts'

export type ServiceClient = SupabaseClient<Database>

export function createServiceClient(url: string, serviceRoleKey: string): ServiceClient {
  return createClient<Database>(url, serviceRoleKey)
}

export function createAuthClient(url: string, anonKey: string, authHeader: string): ServiceClient {
  return createClient<Database>(url, anonKey, {
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
