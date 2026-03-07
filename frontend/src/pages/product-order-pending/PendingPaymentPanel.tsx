import QRCode from 'react-qr-code';
import type { ProductOrderPaymentInfo } from '../product-orders/types';

type PendingPaymentPanelProps = {
  paymentInfo: ProductOrderPaymentInfo;
  instructionSteps: string[];
  onCopyCode: (value: string) => void | Promise<void>;
};

export function PendingPaymentPanel({ paymentInfo, instructionSteps, onCopyCode }: PendingPaymentPanelProps) {
  return (
    <div className="mt-12 border-t border-gray-50 pt-8">
      <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-gray-400">Payment Instructions</h3>

      <div className="space-y-6">
        {paymentInfo.primaryCode ? (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div>
              <p className="text-xs text-gray-500 mb-1">{paymentInfo.primaryCodeLabel || 'Payment Code'}</p>
              <p className="text-xl font-mono font-bold tracking-wider">{paymentInfo.primaryCode}</p>
              {paymentInfo.billerCode && (
                <p className="mt-2 text-xs text-gray-500">
                  Biller Code: <span className="font-mono font-semibold">{paymentInfo.billerCode}</span>
                </p>
              )}
              {paymentInfo.store && (
                <p className="mt-1 text-xs text-gray-500">
                  Store: <span className="font-semibold">{paymentInfo.store}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => void onCopyCode(paymentInfo.primaryCode!)}
              className="text-primary text-xs font-bold hover:underline flex items-center justify-center gap-2"
            >
              COPY <span className="material-symbols-outlined text-sm">content_copy</span>
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Tap “Check Status” to load payment instructions, or use “Pay Now” to continue.
          </div>
        )}

        {paymentInfo.qrString && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">QR Payment</p>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <QRCode value={paymentInfo.qrString} size={220} />
              </div>
            </div>
          </div>
        )}

        {instructionSteps.length > 0 && (
          <div className="space-y-4">
            {instructionSteps.slice(0, 3).map((step, index) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <p className="text-sm text-gray-600 pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        )}

        {paymentInfo.actions.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Actions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {paymentInfo.actions
                .filter((action) => action?.url)
                .slice(0, 4)
                .map((action, index) => (
                  <a
                    key={`${action.name || 'action'}-${index}`}
                    href={String(action.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-white border border-gray-200 hover:border-primary/30 py-3 rounded-xl font-bold text-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                    <span className="text-xs tracking-widest uppercase">
                      {String(action.name || 'Open').replace(/_/g, ' ')}
                    </span>
                  </a>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
