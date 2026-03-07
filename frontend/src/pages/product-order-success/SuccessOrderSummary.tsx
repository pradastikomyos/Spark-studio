import { formatCurrency } from '../../utils/formatters';

type SuccessOrderSummaryProps = {
  total: number;
  totalItems: number;
};

export function SuccessOrderSummary({ total, totalItems }: SuccessOrderSummaryProps) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">Items</span>
        <span>{totalItems}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Subtotal</span>
        <span>{formatCurrency(Number(total ?? 0))}</span>
      </div>
      <div className="pt-4 border-t border-dashed border-gray-200">
        <div className="flex justify-between items-end">
          <span className="text-base font-bold">Total Paid</span>
          <span className="text-xl font-bold text-primary font-display">{formatCurrency(Number(total ?? 0))}</span>
        </div>
      </div>
    </div>
  );
}
