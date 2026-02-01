function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

export function getSupabaseEnv() {
  return {
    url: getRequiredEnv('SUPABASE_URL'),
    anonKey: getRequiredEnv('SUPABASE_ANON_KEY'),
    serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  }
}

export function getMidtransEnv() {
  return {
    serverKey: getRequiredEnv('MIDTRANS_SERVER_KEY'),
    isProduction: (Deno.env.get('MIDTRANS_IS_PRODUCTION') ?? '').toLowerCase() === 'true',
  }
}
