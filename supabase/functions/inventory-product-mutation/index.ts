import { serve } from '../_shared/deps.ts'
import { json, handleCors } from '../_shared/http.ts'
import { requireAdminContext } from '../_shared/admin.ts'
import { deleteImageKitFileById } from '../_shared/imagekit.ts'

type ProductImageRecordInput = {
  image_url: string
  image_provider?: 'supabase' | 'imagekit'
  provider_file_id?: string | null
  provider_file_path?: string | null
  provider_original_url?: string | null
}

type ProductVariantInput = {
  id?: number | string | null
  name?: string | null
  sku?: string | null
  price?: number | string | null
  stock?: number | string | null
  size?: string | null
  color?: string | null
}

type SaveRequest = {
  action: 'save'
  productId?: number | string | null
  name?: string
  slug?: string
  description?: string | null
  categoryId?: number | string | null
  sku?: string
  isActive?: boolean
  syncVariants?: boolean
  variants?: ProductVariantInput[]
  newImages?: ProductImageRecordInput[]
  removedImageUrls?: string[]
}

type DeleteRequest = {
  action: 'delete'
  productId?: number | string | null
}

type CleanupRequest = {
  action: 'cleanup'
  fileIds?: string[]
}

type RequestBody = SaveRequest | DeleteRequest | CleanupRequest

type CleanupResult = {
  cleanedCount: number
  warnings: string[]
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim()
}

function toNullableTrimmedString(value: unknown): string | null {
  const normalized = toTrimmedString(value)
  return normalized.length > 0 ? normalized : null
}

function toValidNumber(value: unknown): number | null {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(numberValue) ? numberValue : null
}

function isMissingRemoteFileError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('404') || normalized.includes('not found') || normalized.includes('no object')
}

async function cleanupImageKitFiles(fileIds: string[]): Promise<CleanupResult> {
  const uniqueFileIds = [...new Set(fileIds.map((fileId) => fileId.trim()).filter((fileId) => fileId.length > 0))]
  const warnings: string[] = []
  let cleanedCount = 0

  for (const fileId of uniqueFileIds) {
    try {
      await deleteImageKitFileById(fileId)
      cleanedCount += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to delete ImageKit file ${fileId}`
      if (isMissingRemoteFileError(message)) {
        cleanedCount += 1
        continue
      }
      warnings.push(message)
    }
  }

  return { cleanedCount, warnings }
}

function buildCleanupSummary(result: CleanupResult): string {
  const parts = [`rolled back ${result.cleanedCount} uploaded image${result.cleanedCount === 1 ? '' : 's'}`]
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} cleanup warning${result.warnings.length === 1 ? '' : 's'}`)
  }
  return parts.join('; ')
}

function buildActionMissingResponse(req: Request): Response {
  return json(req, { error: 'Missing action' }, { status: 400 })
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

    if (!body || typeof body !== 'object' || !('action' in body)) {
      return buildActionMissingResponse(req)
    }

    if (body.action === 'cleanup') {
      const cleanup = await cleanupImageKitFiles(Array.isArray(body.fileIds) ? body.fileIds : [])
      return json(req, {
        ok: true,
        cleanedCount: cleanup.cleanedCount,
        cleanupWarnings: cleanup.warnings,
      })
    }

    if (body.action === 'delete') {
      const productId = toValidNumber(body.productId)
      if (!productId || productId <= 0) {
        return json(req, { error: 'Invalid productId' }, { status: 400 })
      }

      const { data, error } = await context.supabaseService.rpc('delete_inventory_product', {
        p_product_id: productId,
      })

      if (error) {
        return json(req, { error: error.message || 'Failed to delete product' }, { status: 500 })
      }

      const deletedImages = Array.isArray((data as { deleted_images?: unknown } | null)?.deleted_images)
        ? ((data as { deleted_images: ProductImageRecordInput[] }).deleted_images ?? [])
        : []

      const cleanup = await cleanupImageKitFiles(
        deletedImages
          .filter((image) => image.image_provider === 'imagekit' && typeof image.provider_file_id === 'string')
          .map((image) => String(image.provider_file_id ?? '').trim())
      )

      return json(req, {
        ok: true,
        productId,
        deletedImageCount: deletedImages.length,
        cleanupWarnings: cleanup.warnings,
      })
    }

    if (body.action === 'save') {
      const productId = body.productId == null ? null : toValidNumber(body.productId)
      const name = toTrimmedString(body.name)
      const slug = toTrimmedString(body.slug)
      const description = toNullableTrimmedString(body.description)
      const categoryId = body.categoryId == null ? null : toValidNumber(body.categoryId)
      const sku = toTrimmedString(body.sku)
      const isActive = body.isActive ?? true

      if (!name) return json(req, { error: 'Missing product name' }, { status: 400 })
      if (!slug) return json(req, { error: 'Missing product slug' }, { status: 400 })
      if (!sku) return json(req, { error: 'Missing product SKU' }, { status: 400 })
      if (body.categoryId != null && (categoryId == null || categoryId <= 0)) {
        return json(req, { error: 'Invalid categoryId' }, { status: 400 })
      }

      const variants = Array.isArray(body.variants) ? body.variants : []
      const newImages = Array.isArray(body.newImages) ? body.newImages : []
      const removedImageUrls = Array.isArray(body.removedImageUrls) ? body.removedImageUrls : []

      const normalizedVariants = variants.map((variant) => ({
        id: toValidNumber(variant.id),
        name: toTrimmedString(variant.name),
        sku: toTrimmedString(variant.sku),
        price: toNullableTrimmedString(variant.price),
        stock: toValidNumber(variant.stock) ?? 0,
        size: toNullableTrimmedString(variant.size),
        color: toNullableTrimmedString(variant.color),
      }))

      const { data, error } = await context.supabaseService.rpc('save_inventory_product', {
        p_product_id: productId,
        p_name: name,
        p_slug: slug,
        p_description: description,
        p_category_id: categoryId,
        p_sku: sku,
        p_is_active: isActive,
        p_sync_variants: body.syncVariants ?? true,
        p_variants: normalizedVariants,
        p_new_images: newImages.map((image) => ({
          image_url: image.image_url,
          image_provider: image.image_provider ?? 'imagekit',
          provider_file_id: image.provider_file_id ?? null,
          provider_file_path: image.provider_file_path ?? null,
          provider_original_url: image.provider_original_url ?? null,
        })),
        p_removed_image_urls: removedImageUrls,
      })

      if (error) {
        const uploadedImageFileIds = newImages
          .filter((image) => image.image_provider === 'imagekit' && typeof image.provider_file_id === 'string')
          .map((image) => String(image.provider_file_id ?? '').trim())
        const cleanup = await cleanupImageKitFiles(uploadedImageFileIds)
        const cleanupSummary = cleanup.cleanedCount > 0 ? `; ${buildCleanupSummary(cleanup)}` : ''
        const cleanupWarningSummary =
          cleanup.warnings.length > 0 ? `; cleanup warnings: ${cleanup.warnings.join(' | ')}` : ''
        return json(
          req,
          {
            error: `${error.message || 'Failed to save product'}${cleanupSummary}${cleanupWarningSummary}`,
            cleanupWarnings: cleanup.warnings,
          },
          { status: 500 }
        )
      }

      const removedImages = Array.isArray((data as { removed_images?: unknown } | null)?.removed_images)
        ? ((data as { removed_images: ProductImageRecordInput[] }).removed_images ?? [])
        : []

      const cleanup = await cleanupImageKitFiles(
        removedImages
          .filter((image) => image.image_provider === 'imagekit' && typeof image.provider_file_id === 'string')
          .map((image) => String(image.provider_file_id ?? '').trim())
      )

      return json(req, {
        ok: true,
        productId: toValidNumber((data as { product_id?: unknown } | null)?.product_id) ?? productId,
        created: Boolean((data as { created?: unknown } | null)?.created),
        newImageCount: toValidNumber((data as { new_image_count?: unknown } | null)?.new_image_count) ?? 0,
        removedImageCount: removedImages.length,
        variantCount: toValidNumber((data as { variant_count?: unknown } | null)?.variant_count) ?? 0,
        imageCount: toValidNumber((data as { image_count?: unknown } | null)?.image_count) ?? 0,
        cleanupWarnings: cleanup.warnings,
      })
    }

    return buildActionMissingResponse(req)
  } catch (error) {
    console.error('inventory-product-mutation failed', error)
    return json(req, { error: error instanceof Error ? error.message : 'Failed to mutate inventory product' }, { status: 500 })
  }
})
