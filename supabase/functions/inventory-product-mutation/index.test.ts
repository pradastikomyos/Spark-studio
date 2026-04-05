import { beforeEach, describe, expect, it, vi } from 'vitest'

import { requireAdminContext } from '../_shared/admin.ts'
import { deleteImageKitFileById } from '../_shared/imagekit.ts'
import { handleCors } from '../_shared/http.ts'

let capturedHandler: ((req: Request) => Promise<Response>) | null = null

vi.mock('../_shared/deps.ts', () => ({
  serve: (handler: (req: Request) => Promise<Response>) => {
    capturedHandler = handler
  },
}))

vi.mock('../_shared/http.ts', () => ({
  handleCors: vi.fn(() => null),
  json: (_req: Request, payload: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(payload), {
      status: init?.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    }),
}))

vi.mock('../_shared/admin.ts', () => ({
  requireAdminContext: vi.fn(),
}))

vi.mock('../_shared/imagekit.ts', () => ({
  deleteImageKitFileById: vi.fn(),
}))

async function loadHandler() {
  capturedHandler = null
  await vi.resetModules()
  await import('./index.ts')
  if (!capturedHandler) {
    throw new Error('inventory-product-mutation handler was not captured')
  }
  return capturedHandler
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe('inventory-product-mutation edge function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a structured validation error when the product name is missing', async () => {
    const handler = await loadHandler()
    vi.mocked(handleCors).mockReturnValue(null)
    vi.mocked(requireAdminContext).mockResolvedValue({
      context: {
        supabaseService: {
          rpc: vi.fn(),
        },
      },
      response: undefined,
    } as any)

    const response = await handler(
      new Request('http://localhost/functions/v1/inventory-product-mutation', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          productId: null,
          name: '   ',
          slug: 'mar-lettering-welded-charm',
          categoryId: 33,
          sku: 'ICJ171',
          isActive: true,
          syncVariants: true,
          variants: [
            {
              name: '"Mar" Lettering Welded',
              sku: 'ICJ171',
              price: '30.000',
              stock: 9,
            },
          ],
        }),
      })
    )

    expect(response.status).toBe(400)
    expect(await readJson(response)).toMatchObject({
      error: 'Nama produk wajib diisi.',
      code: 'INVENTORY_PRODUCT_NAME_REQUIRED',
      details: null,
      hint: null,
    })
    expect(vi.mocked(requireAdminContext).mock.calls).toHaveLength(1)
  })

  it('propagates rpc errors with structured details', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        message: 'duplicate key value violates unique constraint "products_sku_key"',
        code: '23505',
        details: 'Key (sku)=(ICJ171) already exists.',
        hint: 'Use a different SKU.',
      },
    })

    const handler = await loadHandler()
    vi.mocked(handleCors).mockReturnValue(null)
    vi.mocked(requireAdminContext).mockResolvedValue({
      context: {
        supabaseService: {
          rpc,
        },
      },
      response: undefined,
    } as any)

    const response = await handler(
      new Request('http://localhost/functions/v1/inventory-product-mutation', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          productId: 1588,
          name: '"Mar" Lettering Welded Charm',
          slug: 'mar-lettering-welded-charm',
          description: 'deskripsi',
          categoryId: 33,
          sku: 'ICJ171',
          isActive: true,
          syncVariants: true,
          variants: [
            {
              name: '"Mar" Lettering Welded',
              sku: 'ICJ171',
              price: '30.000',
              stock: 9,
              size: '-',
              color: '-',
            },
          ],
          newImages: [],
          removedImageUrls: [],
        }),
      })
    )

    expect(response.status).toBe(500)
    expect(await readJson(response)).toMatchObject({
      error: 'duplicate key value violates unique constraint "products_sku_key"',
      code: '23505',
      details: 'Key (sku)=(ICJ171) already exists.',
      hint: 'Use a different SKU.',
    })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('saves the product and normalizes the admin format', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        product_id: 1588,
        created: false,
        new_image_count: 0,
        removed_images: [],
        variant_count: 1,
        image_count: 1,
      },
      error: null,
    })

    const handler = await loadHandler()
    vi.mocked(handleCors).mockReturnValue(null)
    vi.mocked(requireAdminContext).mockResolvedValue({
      context: {
        supabaseService: {
          rpc,
        },
      },
      response: undefined,
    } as any)

    const response = await handler(
      new Request('http://localhost/functions/v1/inventory-product-mutation', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          productId: 1588,
          name: '  "Mar" Lettering Welded Charm  ',
          slug: '  Mar-Lettering-Welded-Charm ',
          description: 'deskripsi',
          categoryId: 33,
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
              color: '—',
            },
          ],
          newImages: [],
          removedImageUrls: [],
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await readJson(response)).toMatchObject({
      ok: true,
      productId: 1588,
      created: false,
      variantCount: 1,
      imageCount: 1,
      cleanupWarnings: [],
    })
    expect(rpc).toHaveBeenCalledWith(
      'save_inventory_product',
      expect.objectContaining({
        p_name: '"Mar" Lettering Welded Charm',
        p_slug: 'mar-lettering-welded-charm',
        p_sku: 'ICJ171',
        p_variants: [
          {
            id: null,
            name: '"Mar" Lettering Welded',
            sku: 'ICJ171',
            price: '30000',
            stock: 9,
            size: null,
            color: null,
          },
        ],
      })
    )
    expect(deleteImageKitFileById).not.toHaveBeenCalled()
  })
})
