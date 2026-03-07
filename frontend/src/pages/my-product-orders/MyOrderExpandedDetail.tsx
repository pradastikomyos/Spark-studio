import type { TFunction } from 'i18next';
import { formatCurrency } from '../../utils/formatters';
import { ProductOrderItemsList } from '../product-orders/ProductOrderItemsList';
import type { ProductOrderListItem } from '../product-orders/types';

type MyOrderExpandedDetailProps = {
  order: ProductOrderListItem;
  t: TFunction;
};

export function MyOrderExpandedDetail({ order, t }: MyOrderExpandedDetailProps) {
  return (
    <div className="border-t border-gray-200 bg-gray-50 p-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-4">Order Items</h3>
      <ProductOrderItemsList items={order.items} />
      {order.discount_amount && order.discount_amount > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-emerald-700">
          <span>{t('myOrders.voucher.discount', { code: order.voucher_code || '' })}</span>
          <span>-{formatCurrency(order.discount_amount)}</span>
        </div>
      )}
    </div>
  );
}
