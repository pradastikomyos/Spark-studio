export function PaymentProgress() {
  return (
    <div className="max-w-[800px] mx-auto mb-8">
      <div className="flex flex-col gap-3">
        <div className="flex gap-6 justify-between items-end">
          <p className="text-base font-medium">Step 2 of 3</p>
          <p className="text-sm font-normal opacity-70">66% Complete</p>
        </div>
        <div className="rounded-full bg-rose-100 overflow-hidden">
          <div className="h-2.5 rounded-full bg-primary" style={{ width: '66%' }}></div>
        </div>
        <p className="text-primary text-sm font-medium">Payment Confirmation</p>
      </div>
    </div>
  );
}
