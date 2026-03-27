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

export function getImageKitEnv() {
  const productImagesBasePathRaw = Deno.env.get('IMAGEKIT_PRODUCT_IMAGES_BASE_PATH') ?? '/products'
  const normalizedBasePath = `/${productImagesBasePathRaw.replace(/^\/+|\/+$/g, '')}`.replace(/\/{2,}/g, '/')
  return {
    publicKey: getRequiredEnv('IMAGEKIT_PUBLIC_KEY'),
    privateKey: getRequiredEnv('IMAGEKIT_PRIVATE_KEY'),
    urlEndpoint: getRequiredEnv('IMAGEKIT_URL_ENDPOINT').replace(/\/+$/, ''),
    productImagesBasePath: normalizedBasePath === '/' ? '/products' : normalizedBasePath,
  }
}

export function getPublicAppUrl(): string | null {
  const value =
    Deno.env.get('PUBLIC_APP_URL') ||
    Deno.env.get('SITE_URL') ||
    Deno.env.get('VITE_PUBLIC_APP_URL') ||
    Deno.env.get('VITE_APP_URL')
  if (!value) return null
  return value.replace(/\/+$/, '')
}
