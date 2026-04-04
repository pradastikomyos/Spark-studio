import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveInventoryProductMutation } from './inventoryProductMutations';

const invokeMock = vi.fn();
const ensureFreshTokenMock = vi.fn();
const uploadProductImageMock = vi.fn();

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
    from: vi.fn(),
  },
}));

vi.mock('../../../utils/auth', () => ({
  ensureFreshToken: (...args: unknown[]) => ensureFreshTokenMock(...args),
}));

vi.mock('../../../utils/uploadProductImage', () => ({
  uploadProductImage: (...args: unknown[]) => uploadProductImageMock(...args),
}));

function createDraft(overrides: Partial<Parameters<typeof saveInventoryProductMutation>[0]['draft']> = {}) {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Glow Kit',
    slug: overrides.slug ?? 'glow-kit',
    description: overrides.description ?? 'Test product',
    category_id: overrides.category_id ?? 2,
    sku: overrides.sku ?? 'GLOW-001',
    is_active: overrides.is_active ?? true,
    variants:
      overrides.variants ?? [
        {
          name: 'Default',
          sku: 'GLOW-001-V1',
          price: '120000',
          stock: 10,
        },
      ],
  };
}

describe('saveInventoryProductMutation', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    ensureFreshTokenMock.mockReset();
    uploadProductImageMock.mockReset();
    ensureFreshTokenMock.mockResolvedValue('access-token');
  });

  const auth = {
    session: null,
    getValidAccessToken: vi.fn().mockResolvedValue('access-token'),
    refreshSession: vi.fn().mockResolvedValue(undefined),
  };

  it('updates an existing product by uploading images first and then syncing once', async () => {
    const file = new File(['image'], 'product.jpg', { type: 'image/jpeg' });
    uploadProductImageMock.mockResolvedValue({
      image_url: 'https://ik.example.com/product.jpg',
      image_provider: 'imagekit',
      provider_file_id: 'file-123',
      provider_file_path: '/products/7/file-123.jpg',
      provider_original_url: null,
    });
    invokeMock.mockResolvedValue({
      data: {
        ok: true,
        productId: 7,
        created: false,
        newImageCount: 1,
        removedImageCount: 0,
        variantCount: 1,
        imageCount: 1,
        cleanupWarnings: [],
      },
      error: null,
    });

    await saveInventoryProductMutation({
      draft: createDraft({ id: 7 }),
      newImages: [file],
      removedImageUrls: ['https://example.com/old.jpg'],
      auth,
    });

    expect(uploadProductImageMock).toHaveBeenCalledWith(
      file,
      '7',
      expect.objectContaining({
        accessToken: 'access-token',
      })
    );
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect((invokeMock.mock.calls[0]?.[1] as { body?: { action?: string; syncVariants?: boolean; newImages?: unknown[] } }).body).toMatchObject({
      action: 'save',
      syncVariants: true,
      newImages: [
        {
          image_url: 'https://ik.example.com/product.jpg',
          image_provider: 'imagekit',
          provider_file_id: 'file-123',
          provider_file_path: '/products/7/file-123.jpg',
          provider_original_url: null,
        },
      ],
    });
  });

  it('creates a product first and then attaches images without resyncing variants', async () => {
    const file = new File(['image'], 'product.jpg', { type: 'image/jpeg' });
    uploadProductImageMock.mockResolvedValue({
      image_url: 'https://ik.example.com/product.jpg',
      image_provider: 'imagekit',
      provider_file_id: 'file-456',
      provider_file_path: '/products/42/file-456.jpg',
      provider_original_url: null,
    });
    invokeMock
      .mockResolvedValueOnce({
        data: {
          ok: true,
          productId: 42,
          created: true,
          newImageCount: 0,
          removedImageCount: 0,
          variantCount: 1,
          imageCount: 0,
          cleanupWarnings: [],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          productId: 42,
          created: false,
          newImageCount: 1,
          removedImageCount: 0,
          variantCount: 1,
          imageCount: 1,
          cleanupWarnings: [],
        },
        error: null,
      });

    await saveInventoryProductMutation({
      draft: createDraft(),
      newImages: [file],
      removedImageUrls: [],
      auth,
    });

    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect((invokeMock.mock.calls[0]?.[1] as { body?: { action?: string; syncVariants?: boolean; newImages?: unknown[] } }).body).toMatchObject({
      action: 'save',
      syncVariants: true,
      newImages: [],
    });
    expect((invokeMock.mock.calls[1]?.[1] as { body?: { action?: string; syncVariants?: boolean; newImages?: unknown[] } }).body).toMatchObject({
      action: 'save',
      syncVariants: false,
      newImages: [
        {
          image_url: 'https://ik.example.com/product.jpg',
          image_provider: 'imagekit',
          provider_file_id: 'file-456',
          provider_file_path: '/products/42/file-456.jpg',
          provider_original_url: null,
        },
      ],
    });
  });

  it('surfaces session expiry when the inventory function returns 401', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        status: 401,
        message: 'Edge Function returned a non-2xx status code',
        context: {
          error: 'Unauthorized',
          code: 'INVALID_TOKEN',
        },
      },
    });

    await expect(
      saveInventoryProductMutation({
        draft: createDraft({ id: 7 }),
        newImages: [],
        removedImageUrls: [],
        auth,
      })
    ).rejects.toThrow('Sesi login kadaluarsa. Silakan login ulang.');
  });
});
