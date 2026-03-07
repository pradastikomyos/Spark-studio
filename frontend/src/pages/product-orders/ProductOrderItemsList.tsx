import { formatCurrency } from '../../utils/formatters';
import type { ProductOrderItem } from './types';

type ProductOrderItemsListProps = {
  items: ProductOrderItem[];
};

export function ProductOrderItemsList({ items }: ProductOrderItemsListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-4">
          <div className="h-16 w-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            {item.imageUrl ? (
              <img alt={item.productName} src={item.imageUrl} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="material-symbols-outlined text-gray-400">inventory_2</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium text-gray-900">{item.productName}</p>
            <p className="truncate text-sm text-gray-500">
              {item.variantName} · {item.quantity} × {formatCurrency(item.price)}
            </p>
          </div>
          <span className="font-medium text-gray-900">{formatCurrency(item.subtotal)}</span>
        </div>
      ))}
    </div>
  );
}
