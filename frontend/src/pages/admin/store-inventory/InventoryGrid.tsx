import type { InventoryProduct } from './storeInventoryTypes';
import { InventoryProductCard } from './InventoryProductCard';

type InventoryGridProps = {
  products: InventoryProduct[];
  thumbFallbackIds: Record<number, true>;
  onEdit: (productId: number) => void;
  onDelete: (product: { id: number; name: string }) => void;
  onTrackImageResult: (result: 'loaded' | 'error') => void;
  onThumbFallback: (productId: number) => void;
};

export function InventoryGrid(props: InventoryGridProps) {
  const { products, thumbFallbackIds, onEdit, onDelete, onTrackImageResult, onThumbFallback } = props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <InventoryProductCard
          key={product.id}
          product={product}
          isThumbFallback={Boolean(thumbFallbackIds[product.id])}
          onEdit={onEdit}
          onDelete={onDelete}
          onTrackImageResult={onTrackImageResult}
          onThumbFallback={onThumbFallback}
        />
      ))}
    </div>
  );
}
