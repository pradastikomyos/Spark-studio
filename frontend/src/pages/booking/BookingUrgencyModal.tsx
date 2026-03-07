type BookingUrgencyModalProps = {
  open: boolean;
  selectedTime: string | null;
  minutesLeft: number | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function BookingUrgencyModal(props: BookingUrgencyModalProps) {
  const { open, selectedTime, minutesLeft, onClose, onConfirm } = props;

  if (!open || !selectedTime) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white#1a0c0c] rounded-xl shadow-2xl border-2 border-red-500 max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-red-600 text-2xl animate-pulse">warning</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-red-600 mb-2">Session Ending Soon!</h3>
            <p className="text-sm text-gray-700">
              The session for <span className="font-bold">{selectedTime.substring(0, 5)}</span> ends in{' '}
              <span className="font-bold text-red-600">{minutesLeft} minutes</span>.
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 font-medium mb-2">⚠️ Important Reminders:</p>
          <ul className="text-xs text-red-700 space-y-1">
            <li>• Complete payment within the next few minutes</li>
            <li>• Midtrans payment window: 15-30 minutes</li>
            <li>• You can still book even if session has started</li>
            <li>• Booking closes when session ends (not when it starts)</li>
            <li>• Consider a later session for more flexibility</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-bold text-sm hover:bg-gray-50:bg-gray-800 transition-all"
          >
            Choose Different Time
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-sm transition-all shadow-lg"
          >
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );
}
