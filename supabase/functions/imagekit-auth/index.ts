import { serve } from '../_shared/deps.ts'
import { json, handleCors } from '../_shared/http.ts'
import { requireAdminContext } from '../_shared/admin.ts'
import { createImageKitUploadAuthPayload } from '../_shared/imagekit.ts'

type RequestBody = {
  productId?: number | string
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, { status: 405 })
  }

  const { context, response } = await requireAdminContext(req)
  if (response) return response
  if (!context) return json(req, { error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as RequestBody
    const productId = Number(body.productId)

    if (!Number.isFinite(productId) || productId <= 0) {
      return json(req, { error: 'Invalid productId' }, { status: 400 })
    }

    const { data: productRow, error: productError } = await context.supabaseService
      .from('products')
      .select('id')
      .eq('id', productId)
      .is('deleted_at', null)
      .maybeSingle()

    if (productError) {
      return json(req, { error: 'Failed to verify product' }, { status: 500 })
    }

    if (!productRow?.id) {
      return json(req, { error: 'Product not found' }, { status: 404 })
    }

    const authPayload = await createImageKitUploadAuthPayload(productId)
    return json(req, authPayload)
  } catch (error) {
    console.error('imagekit-auth failed', error)
    return json(
      req,
      { error: error instanceof Error ? error.message : 'Failed to create ImageKit upload auth payload' },
      { status: 500 }
    )
  }
})
