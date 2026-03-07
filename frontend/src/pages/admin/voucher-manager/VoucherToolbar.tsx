import type { TFunction } from 'i18next';
import type { VoucherStatusFilter } from './voucherManagerTypes';

type VoucherToolbarProps = {
  t: TFunction;
  pageSize: number;
  statusFilter: VoucherStatusFilter;
  onOpenCreate: () => void;
  onSetPageSize: (value: number) => void;
  onSetStatusFilter: (value: VoucherStatusFilter) => void;
  onResetPage: () => void;
};

export function VoucherToolbar(props: VoucherToolbarProps) {
  const { t, pageSize, statusFilter, onOpenCreate, onSetPageSize, onSetStatusFilter, onResetPage } = props;

  return (
    <>
      <button onClick={onOpenCreate} className="rounded-lg bg-main-600 px-4 py-2 text-xs font-bold text-white hover:bg-main-700">
        {t('admin.vouchers.actions.create')}
      </button>
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('admin.vouchers.filters.status')}</label>
          <select
            value={statusFilter}
            onChange={(event) => {
              onResetPage();
              onSetStatusFilter(event.target.value as VoucherStatusFilter);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">{t('admin.vouchers.filters.all')}</option>
            <option value="active">{t('admin.vouchers.filters.active')}</option>
            <option value="inactive">{t('admin.vouchers.filters.inactive')}</option>
            <option value="expired">{t('admin.vouchers.filters.expired')}</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{t('admin.vouchers.pagination.rows')}</span>
          <select
            value={pageSize}
            onChange={(event) => {
              onResetPage();
              onSetPageSize(Number(event.target.value));
            }}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
