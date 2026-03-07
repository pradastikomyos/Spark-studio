import BrandedLoader from '../../components/BrandedLoader';

type BookingSuccessPendingStateProps = {
  effectiveStatus: string | null;
  orderNumber: string;
  loadingTimedOut: boolean;
  showManualButton: boolean;
  syncing: boolean;
  autoSyncInProgress: boolean;
  syncError: string | null;
  onRetryLoad: () => void;
  onManualCheck: () => void;
};

export function BookingSuccessPendingState(props: BookingSuccessPendingStateProps) {
  const {
    effectiveStatus,
    orderNumber,
    loadingTimedOut,
    showManualButton,
    syncing,
    autoSyncInProgress,
    syncError,
    onRetryLoad,
    onManualCheck,
  } = props;

  return (
    <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7]#3d2020]">
      <div className="h-2 bg-primary"></div>
      <div className="p-8 md:p-12 text-center">
        {effectiveStatus === 'pending' ? (
          <div className="flex flex-col items-center justify-center py-4">
            <BrandedLoader text="Summoning Your Pass..." size="lg" className="py-8" />
            <p className="text-gray-500 font-medium mt-4">Finalizing your magical journey to the stage.</p>
            <p className="text-xs text-gray-400 mt-8 font-mono">Order Ref: {orderNumber}</p>

            {loadingTimedOut && (
              <div className="mt-6 animate-fade-in">
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    <span className="material-symbols-outlined text-base align-middle mr-1">warning</span>
                    Loading is taking longer than expected. You can retry or check status manually.
                  </p>
                </div>
                <button onClick={onRetryLoad} className="h-11 px-5 rounded-xl border border-red-200 text-red-700 font-bold hover:bg-red-50 transition-all">
                  Retry Loading
                </button>
              </div>
            )}

            {showManualButton && (
              <div className="mt-6 animate-fade-in">
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    <span className="material-symbols-outlined text-base align-middle mr-1">info</span>
                    Payment verification is taking longer than expected.
                  </p>
                </div>
                <button
                  onClick={onManualCheck}
                  disabled={syncing || autoSyncInProgress}
                  className="h-11 px-5 rounded-xl bg-[#ff4b86] text-white font-bold hover:bg-[#e63d75] disabled:opacity-60 transition-all"
                >
                  {syncing || autoSyncInProgress ? 'Checking...' : 'Check Status Manually'}
                </button>
                {syncError && <p className="text-sm text-red-600 mt-3">{syncError}</p>}
              </div>
            )}
          </div>
        ) : (
          <>
            <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">confirmation_number</span>
            <h2 className="text-xl font-bold mb-2">No Tickets Found</h2>
            <p className="text-gray-500">Your tickets may still be processing. Please check back in a moment.</p>
            {loadingTimedOut && (
              <div className="mt-6">
                <button onClick={onRetryLoad} className="h-11 px-5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all">
                  Retry Loading
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
