import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProductImageUpload, { type ImagePreview } from './ProductImageUpload';
import ProductFormModal, { type CategoryOption, type ProductDraft, type ExistingImage } from './ProductFormModal';

const createObjectURLMock = vi.fn(() => 'blob:mock');
const revokeObjectURLMock = vi.fn();

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: createObjectURLMock,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: revokeObjectURLMock,
  });
  createObjectURLMock.mockClear();
  revokeObjectURLMock.mockClear();
});

describe('ProductImageUpload', () => {
  it('caps selected files to remaining slots', () => {
    const onChange = vi.fn<(images: ImagePreview[]) => void>();
    const existingImages = Array.from({ length: 6 }, (_, idx) => ({ url: `https://example.com/${idx}.jpg`, is_primary: idx === 0 }));

    const { container } = render(
      <ProductImageUpload
        images={[]}
        existingImages={existingImages}
        maxImages={8}
        onChange={onChange}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const files = Array.from({ length: 5 }, (_, idx) => new File([`file-${idx}`], `img-${idx}.png`, { type: 'image/png' }));
    fireEvent.change(input as HTMLInputElement, { target: { files } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const nextImages = onChange.mock.calls[0][0];
    expect(nextImages).toHaveLength(2); // remaining slots: 8 - 6 = 2
  });

  it('hides Add Image button when already at max', () => {
    const onChange = vi.fn<(images: ImagePreview[]) => void>();
    const existingImages = Array.from({ length: 8 }, (_, idx) => ({ url: `https://example.com/${idx}.jpg`, is_primary: idx === 0 }));

    render(
      <ProductImageUpload
        images={[]}
        existingImages={existingImages}
        maxImages={8}
        onChange={onChange}
      />
    );

    expect(screen.queryByRole('button', { name: 'Add Image' })).toBeNull();
  });
});

describe('ProductFormModal', () => {
  it('blocks saving when existing images exceed max', () => {
    const categories: CategoryOption[] = [{ id: 1, name: 'Cat', slug: 'cat' }];
    const initialValue: ProductDraft = {
      id: 123,
      name: 'Test Product',
      slug: 'test-product',
      description: '',
      category_id: 1,
      sku: 'SKU-001',
      is_active: true,
      variants: [{ id: 1, name: 'Default', sku: 'VAR-001', price: '10000', stock: 1 }],
    };
    const existingImages: ExistingImage[] = Array.from({ length: 9 }, (_, idx) => ({
      url: `https://example.com/${idx}.jpg`,
      is_primary: idx === 0,
    }));
    const onSave = vi.fn();

    render(
      <ProductFormModal
        isOpen
        categories={categories}
        initialValue={initialValue}
        existingImages={existingImages}
        onClose={() => {}}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Max 8 product images allowed.')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('preserves an in-progress edit when the same product props are refreshed', () => {
    const categories: CategoryOption[] = [{ id: 1, name: 'Cat', slug: 'cat' }];
    const initialValue: ProductDraft = {
      id: 123,
      name: 'Server Product',
      slug: 'server-product',
      description: '',
      category_id: 1,
      sku: 'SKU-001',
      is_active: true,
      variants: [{ id: 1, name: 'Default', sku: 'VAR-001', price: '10000', stock: 1 }],
    };

    const { rerender } = render(
      <ProductFormModal
        isOpen
        categories={categories}
        initialValue={initialValue}
        existingImages={[]}
        onClose={() => {}}
        onSave={() => {}}
      />
    );

    const nameInput = screen.getByPlaceholderText('Product name') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Draft In Progress' } });
    expect(nameInput.value).toBe('Draft In Progress');

    rerender(
      <ProductFormModal
        isOpen
        categories={categories}
        initialValue={{ ...initialValue, name: 'Server Product Updated' }}
        existingImages={[]}
        onClose={() => {}}
        onSave={() => {}}
      />
    );

    expect((screen.getByPlaceholderText('Product name') as HTMLInputElement).value).toBe('Draft In Progress');
  });

  it('revokes generated preview URLs when the modal closes', () => {
    const categories: CategoryOption[] = [{ id: 1, name: 'Cat', slug: 'cat' }];
    const initialValue: ProductDraft = {
      name: 'Preview Product',
      slug: 'preview-product',
      description: '',
      category_id: 1,
      sku: 'SKU-001',
      is_active: true,
      variants: [{ name: 'Default', sku: 'VAR-001', price: '10000', stock: 1 }],
    };

    const { container, rerender } = render(
      <ProductFormModal
        isOpen
        categories={categories}
        initialValue={initialValue}
        existingImages={[]}
        onClose={() => {}}
        onSave={() => {}}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [new File(['preview'], 'preview.png', { type: 'image/png' })],
      },
    });

    expect(createObjectURLMock).toHaveBeenCalled();

    rerender(
      <ProductFormModal
        isOpen={false}
        categories={categories}
        initialValue={initialValue}
        existingImages={[]}
        onClose={() => {}}
        onSave={() => {}}
      />
    );

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock');
  });
});
