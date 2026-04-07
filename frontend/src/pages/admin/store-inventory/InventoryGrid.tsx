import type { InventoryProduct } from './storeInventoryTypes';
import { InventoryProductCard } from './InventoryProductCard';

type InventoryGridProps = {
  products: InventoryProduct[];
  thumbFallbackIds: Record<number, true>;
  saving?: boolean;
  onEdit: (productId: number) => void;
  onDelete: (product: { id: number; name: string }) => void;
  onToggleActive: (productId: number, currentlyActive: boolean) => void;
  onTrackImageResult: (result: 'loaded' | 'error') => void;
  onThumbFallback: (productId: number) => void;
};

export function InventoryGrid(props: InventoryGridProps) {
  const { products, thumbFallbackIds, saving, onEdit, onDelete, onToggleActive, onTrackImageResult, onThumbFallback } =
    props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <InventoryProductCard
          key={product.id}
          product={product}
          isThumbFallback={Boolean(thumbFallbackIds[product.id])}
          saving={saving}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleActive={onToggleActive}
          onTrackImageResult={onTrackImageResult}
          onThumbFallback={onThumbFallback}
        />
      ))}
    </div>
  );
}
