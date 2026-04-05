import { describe, expect, it } from 'vitest'

import {
  findDuplicateVariantSku,
  normalizeInventorySavePayload,
  normalizePlaceholderAttribute,
  validateInventorySavePayload,
} from './payload'

describe('inventory-product-mutation payload', () => {
  it('accepts the admin listing format used in the product modal', () => {
    const payload = normalizeInventorySavePayload({
      name: '  "Mar" Lettering Welded Charm  ',
      slug: '  Mar-Lettering-Welded-Charm ',
      description: 'deskripsi',
      categoryId: '33',
      sku: ' icj171 ',
      isActive: true,
      syncVariants: true,
      variants: [
        {
          name: ' "Mar" Lettering Welded ',
          sku: 'icj171',
          price: '30.000',
          stock: '9',
          size: '-',
          color: '\u2014',
        },
      ],
    })

    expect(payload).toMatchObject({
      name: '"Mar" Lettering Welded Charm',
      slug: 'mar-lettering-welded-charm',
      description: 'deskripsi',
      categoryId: 33,
      sku: 'ICJ171',
      syncVariants: true,
    })
    expect(payload.variants).toEqual([
      {
        id: null,
        name: '"Mar" Lettering Welded',
        sku: 'ICJ171',
        price: '30000',
        stock: 9,
        size: null,
        color: null,
      },
    ])
    expect(validateInventorySavePayload(payload)).toBeNull()
  })

  it('treats dash-like size and color placeholders as empty attributes', () => {
    expect(normalizePlaceholderAttribute('-')).toBeNull()
    expect(normalizePlaceholderAttribute('\u2013')).toBeNull()
    expect(normalizePlaceholderAttribute('\u2014')).toBeNull()
    expect(normalizePlaceholderAttribute('Gold')).toBe('Gold')
  })

  it('rejects duplicate variant skus case-insensitively', () => {
    const payload = normalizeInventorySavePayload({
      name: 'Test Product',
      slug: 'test-product',
      categoryId: 1,
      sku: 'SKU-001',
      variants: [
        { name: 'Default', sku: 'VAR-001', price: '10000', stock: 1 },
        { name: 'Alt', sku: 'var-001', price: '12000', stock: 2 },
      ],
    })

    expect(findDuplicateVariantSku(payload.variants)).toBe('VAR-001')
    expect(validateInventorySavePayload(payload)).toMatchObject({
      code: 'INVENTORY_VARIANT_SKU_DUPLICATE',
    })
  })

  it('rejects invalid grouped price before touching the database', () => {
    const payload = normalizeInventorySavePayload({
      name: 'Test Product',
      slug: 'test-product',
      categoryId: 1,
      sku: 'SKU-001',
      variants: [{ name: 'Default', sku: 'VAR-001', price: '30.0a0', stock: '9' }],
    })

    expect(validateInventorySavePayload(payload)).toMatchObject({
      code: 'INVENTORY_VARIANT_PRICE_INVALID',
    })
  })

  it('rejects decimal-like price even when numeric', () => {
    const payload = normalizeInventorySavePayload({
      name: 'Test Product',
      slug: 'test-product',
      categoryId: 1,
      sku: 'SKU-001',
      variants: [{ name: 'Default', sku: 'VAR-001', price: '30000.50', stock: '9' }],
    })

    expect(validateInventorySavePayload(payload)).toMatchObject({
      code: 'INVENTORY_VARIANT_PRICE_INVALID',
    })
  })

  it('rejects invalid stock instead of silently coercing it to zero', () => {
    const payload = normalizeInventorySavePayload({
      name: 'Test Product',
      slug: 'test-product',
      categoryId: 1,
      sku: 'SKU-001',
      variants: [{ name: 'Default', sku: 'VAR-001', price: '30000', stock: '1.5' }],
    })

    expect(validateInventorySavePayload(payload)).toMatchObject({
      code: 'INVENTORY_VARIANT_STOCK_INVALID',
    })
  })
})
