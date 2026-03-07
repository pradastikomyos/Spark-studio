import type { TFunction } from 'i18next';

type VoucherPaginationProps = {
  t: TFunction;
  page: number;
  totalPages: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
};

export function VoucherPagination(props: VoucherPaginationProps) {
  const { t, page, totalPages, totalCount, onPrev, onNext } = props;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
      <span>
        {t('admin.vouchers.pagination.summary', {
          page,
          total: totalPages,
          count: totalCount,
        })}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={onPrev} disabled={page <= 1} className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50">
          {t('admin.vouchers.pagination.prev')}
        </button>
        <button onClick={onNext} disabled={page >= totalPages} className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50">
          {t('admin.vouchers.pagination.next')}
        </button>
      </div>
    </div>
  );
}
