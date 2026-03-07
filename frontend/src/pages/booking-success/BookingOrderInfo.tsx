type BookingOrderInfoProps = {
  orderNumber: string;
};

export function BookingOrderInfo({ orderNumber }: BookingOrderInfoProps) {
  return (
    <div className="mb-6 text-center">
      <p className="text-sm text-gray-500">Order Number</p>
      <p className="text-lg font-mono font-bold">{orderNumber}</p>
    </div>
  );
}
