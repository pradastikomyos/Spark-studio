export function BookingProgressHeader() {
  return (
    <div className="mb-10">
      <div className="flex flex-col gap-3">
        <div className="flex gap-6 justify-between items-end">
          <p className="text-primary text-sm font-bold uppercase tracking-widest">Step 1: Selection</p>
          <p className="text-sm font-normal opacity-70">33% Complete</p>
        </div>
        <div className="rounded-full bg-rose-100 overflow-hidden">
          <div className="h-1.5 rounded-full bg-primary" style={{ width: '33%' }}></div>
        </div>
      </div>
    </div>
  );
}
