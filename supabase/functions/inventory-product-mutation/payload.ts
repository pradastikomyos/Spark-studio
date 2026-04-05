export type {
  InventorySavePayload as SaveRequestPayload,
  InventorySaveValidationError,
  InventoryVariantInput as ProductVariantInput,
  NormalizedInventorySavePayload as NormalizedSaveRequestPayload,
  NormalizedInventoryVariant as NormalizedVariantInput,
} from '../../../frontend/src/lib/inventoryProductContract.ts'

export {
  findDuplicateVariantSku,
  normalizeInventorySavePayload,
  normalizeNumberLikeString,
  normalizePlaceholderAttribute,
  normalizeSlug,
  normalizeSku,
  normalizeText,
  toNullableTrimmedString,
  toTrimmedString,
  toValidNumber,
  validateInventorySavePayload,
} from '../../../frontend/src/lib/inventoryProductContract.ts'
