type PendingStatusView = {
  kind: 'pending' | 'expired' | 'cancelled' | 'failed' | 'refunded';
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  iconText: string;
};

type PendingOrderHeroProps = {
  statusView: PendingStatusView;
  countdown: { hours: number; minutes: number; seconds: number } | null;
};

export function PendingOrderHero({ statusView, countdown }: PendingOrderHeroProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className={`w-20 h-20 ${statusView.iconBg} rounded-full flex items-center justify-center mb-2`}>
          <span className={`material-symbols-outlined ${statusView.iconText} text-4xl`}>{statusView.icon}</span>
        </div>
        <h2 className="text-2xl font-semibold">{statusView.title}</h2>
        <p className="text-gray-500 max-w-md">{statusView.description}</p>

        {statusView.kind === 'pending' && countdown && (
          <div className="flex space-x-4 mt-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-gray-800">{String(countdown.hours).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Hours</span>
            </div>
            <span className="text-3xl font-bold text-gray-300">:</span>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-gray-800">{String(countdown.minutes).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mins</span>
            </div>
            <span className="text-3xl font-bold text-gray-300">:</span>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-gray-800">{String(countdown.seconds).padStart(2, '0')}</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Secs</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
