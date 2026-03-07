import type { TFunction } from 'i18next';

type MyOrdersTabsProps = {
  activeTab: 'pending' | 'active' | 'history';
  pendingCount: number;
  activeCount: number;
  historyCount: number;
  isFetching: boolean;
  onChange: (tab: 'pending' | 'active' | 'history') => void;
  t: TFunction;
};

export function MyOrdersTabs({
  activeTab,
  pendingCount,
  activeCount,
  historyCount,
  isFetching,
  onChange,
  t,
}: MyOrdersTabsProps) {
  const tabs = [
    {
      id: 'pending' as const,
      label: t('myOrders.tabs.pending', 'Pending'),
      icon: 'schedule',
      activeClass: 'bg-yellow-500 text-white shadow-sm',
      inactiveBadgeClass: 'bg-yellow-100 text-yellow-700',
      activeBadgeClass: 'bg-white text-yellow-600',
      count: pendingCount,
    },
    {
      id: 'active' as const,
      label: t('myOrders.tabs.active'),
      icon: 'qr_code_2',
      activeClass: 'bg-main-600 text-white shadow-sm',
      inactiveBadgeClass: 'bg-main-100 text-main-700',
      activeBadgeClass: 'bg-white text-main-600',
      count: activeCount,
    },
    {
      id: 'history' as const,
      label: t('myOrders.tabs.history'),
      icon: 'history',
      activeClass: 'bg-gray-600 text-white shadow-sm',
      inactiveBadgeClass: 'bg-gray-100 text-gray-600',
      activeBadgeClass: 'bg-white text-gray-600',
      count: historyCount,
    },
  ];

  return (
    <div className="flex items-center gap-3">
      {isFetching && (
        <div className="flex items-center gap-1.5 text-xs text-main-600">
          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          {t('myOrders.updating')}
        </div>
      )}
      <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 md:px-4 py-2 text-xs md:text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id ? tab.activeClass : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="material-symbols-outlined text-sm md:text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`ml-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                  activeTab === tab.id ? tab.activeBadgeClass : tab.inactiveBadgeClass
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
