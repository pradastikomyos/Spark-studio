export type InventoryVariantInput = {
  id?: number | string | null
  name?: string | null
  sku?: string | null
  price?: number | string | null
  stock?: number | string | null
  size?: string | null
  color?: string | null
}

export type InventorySavePayload = {
  productId?: number | string | null
  name?: string
  slug?: string
  description?: string | null
  categoryId?: number | string | null
  sku?: string
  isActive?: boolean
  syncVariants?: boolean
  variants?: InventoryVariantInput[]
}

export type NormalizedInventoryVariant = {
  id: number | null
  name: string
  sku: string
  price: string | null
  stock: number | null
  size: string | null
  color: string | null
}

export type NormalizedInventorySavePayload = {
  productId: number | null
  name: string
  slug: string
  description: string | null
  categoryId: number | null
  sku: string
  isActive: boolean
  syncVariants: boolean
  variants: NormalizedInventoryVariant[]
}

export type InventorySaveValidationError = {
  message: string
  code: string
  details?: string | null
  hint?: string | null
}

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\uFEFF]/g, '')
    .trim()
}

export function toTrimmedString(value: unknown): string {
  return normalizeText(value)
}

export function toNullableTrimmedString(value: unknown): string | null {
  const normalized = toTrimmedString(value)
  return normalized.length > 0 ? normalized : null
}

export function normalizeSku(value: unknown): string {
  return normalizeText(value)
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .toUpperCase()
}

export function normalizeSlug(value: unknown): string {
  return normalizeText(value).toLowerCase()
}

export function normalizePlaceholderAttribute(value: unknown): string | null {
  const normalized = toNullableTrimmedString(value)
  if (!normalized) return null
  return /^(?:-|[\u2010-\u2015\u2212])+$/.test(normalized) ? null : normalized
}

export function normalizeNumberLikeString(value: unknown): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null
  }

  const normalized = toNullableTrimmedString(value)
  if (!normalized) return null

  if (/^\d{1,3}([.,]\d{3})+$/.test(normalized)) {
    return normalized.replace(/[.,]/g, '')
  }

  return normalized
}

export function toValidNumber(value: unknown): number | null {
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(numberValue) ? numberValue : null
}

export function findDuplicateVariantSku(variants: NormalizedInventoryVariant[]): string | null {
  const seen = new Set<string>()
  for (const variant of variants) {
    const normalizedSku = variant.sku.trim().toUpperCase()
    if (!normalizedSku) continue
    if (seen.has(normalizedSku)) return normalizedSku
    seen.add(normalizedSku)
  }
  return null
}

export function normalizeInventorySavePayload(body: InventorySavePayload): NormalizedInventorySavePayload {
  const variants = Array.isArray(body.variants) ? body.variants : []

  return {
    productId: body.productId == null ? null : toValidNumber(body.productId),
    name: toTrimmedString(body.name),
    slug: normalizeSlug(body.slug),
    description: toNullableTrimmedString(body.description),
    categoryId: body.categoryId == null ? null : toValidNumber(body.categoryId),
    sku: normalizeSku(body.sku),
    isActive: body.isActive ?? true,
    syncVariants: body.syncVariants ?? true,
    variants: variants.map((variant) => ({
      id: toValidNumber(variant.id),
      name: toTrimmedString(variant.name),
      sku: normalizeSku(variant.sku),
      price: normalizeNumberLikeString(variant.price),
      stock: toValidNumber(normalizeNumberLikeString(variant.stock)),
      size: normalizePlaceholderAttribute(variant.size),
      color: normalizePlaceholderAttribute(variant.color),
    })),
  }
}

export function validateInventorySavePayload(
  payload: NormalizedInventorySavePayload
): InventorySaveValidationError | null {
  if (!payload.name) {
    return {
      message: 'Nama produk wajib diisi.',
      code: 'INVENTORY_PRODUCT_NAME_REQUIRED',
    }
  }

  if (!payload.slug) {
    return {
      message: 'Slug produk wajib diisi.',
      code: 'INVENTORY_PRODUCT_SLUG_REQUIRED',
    }
  }

  if (!payload.sku) {
    return {
      message: 'SKU produk wajib diisi.',
      code: 'INVENTORY_PRODUCT_SKU_REQUIRED',
    }
  }

  if (payload.categoryId == null || payload.categoryId <= 0) {
    return {
      message: 'Kategori produk wajib dipilih.',
      code: 'INVENTORY_CATEGORY_REQUIRED',
    }
  }

  if (!payload.syncVariants) {
    return null
  }

  if (payload.variants.length === 0) {
    return {
      message: 'Produk harus memiliki minimal satu variant.',
      code: 'INVENTORY_VARIANT_REQUIRED',
    }
  }

  const duplicateVariantSku = findDuplicateVariantSku(payload.variants)
  if (duplicateVariantSku) {
    return {
      message: `SKU variant "${duplicateVariantSku}" dipakai lebih dari sekali di form ini.`,
      code: 'INVENTORY_VARIANT_SKU_DUPLICATE',
      hint: 'Gunakan SKU variant yang unik sebelum menyimpan produk.',
    }
  }

  for (let index = 0; index < payload.variants.length; index += 1) {
    const variant = payload.variants[index]
    const variantNumber = index + 1

    if (!variant.name) {
      return {
        message: `Nama variant #${variantNumber} wajib diisi.`,
        code: 'INVENTORY_VARIANT_NAME_REQUIRED',
      }
    }

    if (!variant.sku) {
      return {
        message: `SKU variant "${variant.name}" wajib diisi.`,
        code: 'INVENTORY_VARIANT_SKU_REQUIRED',
      }
    }

    const priceNumber = variant.price == null ? null : Number(variant.price)
    if (priceNumber == null || !Number.isFinite(priceNumber) || !Number.isInteger(priceNumber) || priceNumber <= 0) {
      return {
        message: `Harga variant "${variant.name}" harus lebih besar dari 0.`,
        code: 'INVENTORY_VARIANT_PRICE_INVALID',
        hint: 'Gunakan harga rupiah bulat tanpa desimal, misalnya 30000 atau 30.000.',
      }
    }

    if (variant.stock == null || !Number.isInteger(variant.stock) || variant.stock < 0) {
      return {
        message: `Stok variant "${variant.name}" harus berupa bilangan bulat 0 atau lebih.`,
        code: 'INVENTORY_VARIANT_STOCK_INVALID',
      }
    }
  }

  return null
}
