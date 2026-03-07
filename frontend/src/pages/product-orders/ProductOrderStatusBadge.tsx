type ProductOrderStatusBadgeProps = {
  label: string;
  tone: 'yellow' | 'amber' | 'green' | 'gray' | 'red' | 'blue';
};

const toneClasses: Record<ProductOrderStatusBadgeProps['tone'], string> = {
  yellow: 'bg-yellow-100 text-yellow-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-green-100 text-green-700',
  gray: 'bg-gray-100 text-gray-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
};

export function ProductOrderStatusBadge({ label, tone }: ProductOrderStatusBadgeProps) {
  return <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${toneClasses[tone]}`}>{label}</span>;
}
