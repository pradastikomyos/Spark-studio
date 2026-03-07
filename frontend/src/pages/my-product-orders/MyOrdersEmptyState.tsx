import type { TFunction } from 'i18next';

type MyOrdersEmptyStateProps = {
  activeTab: 'pending' | 'active' | 'history';
  onBrowseShop: () => void;
  t: TFunction;
};

export function MyOrdersEmptyState({ activeTab, onBrowseShop, t }: MyOrdersEmptyStateProps) {
  return (
    <div className="text-center py-16">
      <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
        {activeTab === 'pending' ? 'schedule' : activeTab === 'active' ? 'qr_code_2' : 'history'}
      </span>
      <p className="text-gray-500 text-lg mb-2">
        {activeTab === 'pending'
          ? t('myOrders.empty.pending.title', 'No pending payments')
          : activeTab === 'active'
            ? t('myOrders.empty.active.title')
            : t('myOrders.empty.history.title')}
      </p>
      <p className="text-gray-400 text-sm mb-6">
        {activeTab === 'pending'
          ? t('myOrders.empty.pending.subtitle', 'All your orders are paid!')
          : activeTab === 'active'
            ? t('myOrders.empty.active.subtitle')
            : t('myOrders.empty.history.subtitle')}
      </p>
      {activeTab !== 'history' && (
        <button
          onClick={onBrowseShop}
          className="inline-flex items-center gap-2 px-6 py-3 bg-main-600 text-white text-sm font-bold rounded-lg hover:bg-main-700 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined">shopping_cart</span>
          {t('myOrders.actions.browseShop')}
        </button>
      )}
    </div>
  );
}
