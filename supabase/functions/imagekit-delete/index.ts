import { serve } from '../_shared/deps.ts'
import { json, handleCors } from '../_shared/http.ts'
import { requireAdminContext } from '../_shared/admin.ts'
import { deleteImageKitFileById } from '../_shared/imagekit.ts'

type RequestBody = {
  fileId?: string
  productImageId?: number | string
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
    const fileId = String(body.fileId ?? '').trim()
    const productImageId = Number(body.productImageId)

    if (!fileId) {
      return json(req, { error: 'Missing fileId' }, { status: 400 })
    }

    let productImageQuery = context.supabaseService
      .from('product_images')
      .select('id, image_provider, provider_file_id')
      .eq('image_provider', 'imagekit')

    if (Number.isFinite(productImageId) && productImageId > 0) {
      productImageQuery = productImageQuery.eq('id', productImageId)
    } else {
      productImageQuery = productImageQuery.eq('provider_file_id', fileId)
    }

    const { data: productImageRow, error: productImageError } = await productImageQuery.maybeSingle()

    if (productImageError) {
      return json(req, { error: 'Failed to verify product image' }, { status: 500 })
    }

    if (!productImageRow?.id || String(productImageRow.provider_file_id ?? '').trim() !== fileId) {
      return json(req, { error: 'Product image not found for this fileId' }, { status: 404 })
    }

    await deleteImageKitFileById(fileId)
    return json(req, { ok: true, productImageId: productImageRow.id })
  } catch (error) {
    console.error('imagekit-delete failed', error)
    return json(req, { error: error instanceof Error ? error.message : 'Failed to delete ImageKit file' }, { status: 500 })
  }
})
