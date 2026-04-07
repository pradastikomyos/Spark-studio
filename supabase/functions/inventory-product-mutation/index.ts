import { serve } from '../_shared/deps.ts'
import { requireAdminContext } from '../_shared/admin.ts'
import { json, handleCors } from '../_shared/http.ts'
import { deleteImageKitFileById } from '../_shared/imagekit.ts'
import {
  type ProductVariantInput,
  normalizeInventorySavePayload,
  toNullableTrimmedString,
  toTrimmedString,
  toValidNumber,
  validateInventorySavePayload,
} from './payload.ts'

type ProductImageRecordInput = {
  image_url: string
  image_provider?: 'supabase' | 'imagekit'
  provider_file_id?: string | null
  provider_file_path?: string | null
  provider_original_url?: string | null
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

type ToggleActiveRequest = {
  action: 'toggle_active'
  productId?: number | string | null
  isActive?: boolean
}

type RequestBody = SaveRequest | DeleteRequest | CleanupRequest | ToggleActiveRequest

type CleanupResult = {
  cleanedCount: number
  warnings: string[]
}

type SerializableError = {
  message: string
  details: string | null
  hint: string | null
  code: string | null
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

function buildValidationErrorResponse(
  req: Request,
  params: { message: string; code: string; details?: string | null; hint?: string | null }
): Response {
  return json(
    req,
    {
      error: params.message,
      code: params.code,
      details: params.details ?? null,
      hint: params.hint ?? null,
    },
    { status: 400 }
  )
}

function serializeError(error: unknown, fallbackMessage: string): SerializableError {
  const fallback = fallbackMessage.trim() || 'Unexpected error'
  if (error instanceof Error) {
    const maybe = error as Error & { details?: unknown; hint?: unknown; code?: unknown }
    return {
      message: toTrimmedString(error.message) || fallback,
      details: toNullableTrimmedString(maybe.details),
      hint: toNullableTrimmedString(maybe.hint),
      code: toNullableTrimmedString(maybe.code),
    }
  }

  if (error && typeof error === 'object') {
    const maybe = error as {
      message?: unknown
      details?: unknown
      hint?: unknown
      code?: unknown
      error?: unknown
    }

    const nested =
      maybe.error && typeof maybe.error === 'object'
        ? (maybe.error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown; error?: unknown })
        : null

    return {
      message:
        toNullableTrimmedString(typeof maybe.error === 'object' ? null : maybe.error) ??
        toNullableTrimmedString(maybe.message) ??
        toNullableTrimmedString(nested?.message) ??
        toNullableTrimmedString(typeof nested?.error === 'object' ? null : nested?.error) ??
        fallback,
      details: toNullableTrimmedString(maybe.details) ?? toNullableTrimmedString(nested?.details),
      hint: toNullableTrimmedString(maybe.hint) ?? toNullableTrimmedString(nested?.hint),
      code: toNullableTrimmedString(maybe.code) ?? toNullableTrimmedString(nested?.code),
    }
  }

  const message = toTrimmedString(error)
  return {
    message: message || fallback,
    details: null,
    hint: null,
    code: null,
  }
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, { status: 405 })
  }

  const { context, response } = await requireAdminContext(req)
  if (response) return response
  if (!context) return json(req, { error: 'Unauthorized' }, { status: 401 })

  let requestAction: RequestBody['action'] | null = null
  let requestProductId: number | null = null

  try {
    const body = (await req.json()) as RequestBody

    if (!body || typeof body !== 'object' || !('action' in body)) {
      return buildActionMissingResponse(req)
    }

    requestAction = body.action
    if (body.action === 'save' || body.action === 'delete') {
      requestProductId = toValidNumber(body.productId)
    }

    if (body.action === 'toggle_active') {
      const productId = toValidNumber(body.productId)
      if (!productId || productId <= 0) {
        return json(req, { error: 'Invalid productId' }, { status: 400 })
      }
      const isActive = typeof body.isActive === 'boolean' ? body.isActive : true

      const { error } = await context.supabaseService
        .from('products')
        .update({ is_active: isActive })
        .eq('id', productId)
        .is('deleted_at', null)

      if (error) {
        const serializedError = serializeError(error, 'Failed to toggle product active state')
        return json(
          req,
          {
            error: serializedError.message,
            details: serializedError.details,
            hint: serializedError.hint,
            code: serializedError.code,
          },
          { status: 500 }
        )
      }

      return json(req, { ok: true, productId, isActive })
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
        const serializedError = serializeError(error, 'Failed to delete product')
        return json(
          req,
          {
            error: serializedError.message,
            details: serializedError.details,
            hint: serializedError.hint,
            code: serializedError.code,
          },
          { status: 500 }
        )
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
      const normalizedPayload = normalizeInventorySavePayload(body)
      const newImages = Array.isArray(body.newImages) ? body.newImages : []
      const removedImageUrls = Array.isArray(body.removedImageUrls) ? body.removedImageUrls : []

      const validationError = validateInventorySavePayload(normalizedPayload)
      if (validationError) {
        return buildValidationErrorResponse(req, validationError)
      }

      const { data, error } = await context.supabaseService.rpc('save_inventory_product', {
        p_product_id: normalizedPayload.productId,
        p_name: normalizedPayload.name,
        p_slug: normalizedPayload.slug,
        p_description: normalizedPayload.description,
        p_category_id: normalizedPayload.categoryId,
        p_sku: normalizedPayload.sku,
        p_is_active: normalizedPayload.isActive,
        p_sync_variants: normalizedPayload.syncVariants,
        p_variants: normalizedPayload.variants,
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
        const serializedError = serializeError(error, 'Failed to save product')
        const cleanupDetails = [
          serializedError.details,
          cleanup.cleanedCount > 0 ? buildCleanupSummary(cleanup) : null,
          cleanup.warnings.length > 0 ? `cleanup warnings: ${cleanup.warnings.join(' | ')}` : null,
        ]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .join(' | ')

        return json(
          req,
          {
            error: serializedError.message,
            details: cleanupDetails || null,
            hint: serializedError.hint,
            code: serializedError.code,
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
        productId:
          toValidNumber((data as { product_id?: unknown } | null)?.product_id) ?? normalizedPayload.productId,
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
    console.error('inventory-product-mutation failed', {
      action: requestAction,
      productId: requestProductId,
      error,
    })
    const serializedError = serializeError(error, 'Failed to mutate inventory product')
    return json(
      req,
      {
        error: serializedError.message,
        details: serializedError.details,
        hint: serializedError.hint,
        code: serializedError.code,
      },
      { status: 500 }
    )
  }
})
