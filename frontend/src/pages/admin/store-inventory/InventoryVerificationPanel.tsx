type InventoryVerificationPanelProps = {
  orderCode: string;
  onOrderCodeChange: (value: string) => void;
  onOpenScanner: () => void;
  onVerify: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function InventoryVerificationPanel(props: InventoryVerificationPanelProps) {
  const { orderCode, onOrderCodeChange, onOpenScanner, onVerify, onKeyDown } = props;

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row">
        <button
          type="button"
          onClick={onOpenScanner}
          className="flex-1 p-8 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-center items-center bg-gray-50/50 relative group hover:bg-gray-100 transition-colors"
        >
          <div className="h-24 w-24 rounded-lg border-4 border-dashed border-gray-300 flex items-center justify-center mb-4 group-hover:border-primary group-hover:text-primary transition-all text-gray-600">
            <span className="material-symbols-outlined text-4xl">qr_code_scanner</span>
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-1">Click to Activate Camera</h3>
          <p className="text-sm text-gray-500 font-sans">Scan customer pickup code instantly</p>
        </button>
        <div className="flex-1 p-8 flex flex-col justify-center gap-6">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Manual Verification</h3>
            <p className="text-sm text-gray-500 font-sans mb-4">Enter the 8-digit order code if scanning fails.</p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                placeholder="ORD-XXXX-XXXX"
                type="text"
                value={orderCode}
                onChange={(event) => onOrderCodeChange(event.target.value.toUpperCase())}
                onKeyDown={onKeyDown}
              />
              <button onClick={onVerify} className="rounded-lg bg-[#ff4b86] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-opacity">
                Verify
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Scanner Ready</span>
            </div>
            <div className="h-4 w-px bg-gray-200"></div>
            <span className="text-xs font-medium text-gray-500 font-sans">0 Pickups pending today</span>
          </div>
        </div>
      </div>
    </section>
  );
}
