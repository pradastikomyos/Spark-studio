import type { TFunction } from 'i18next';
import { formatCurrency } from '../../../utils/formatters';
import { discountValueLabel, formatValidity, statusLabel } from './voucherPresentation';
import type { VoucherRow, VoucherStats } from './voucherManagerTypes';

type VoucherTableProps = {
  t: TFunction;
  vouchers: VoucherRow[];
  statsByVoucherId: Record<string, VoucherStats>;
  loading: boolean;
  onEdit: (voucher: VoucherRow) => void;
  onToggleActive: (voucher: VoucherRow) => void;
  onDelete: (voucher: VoucherRow) => void;
};

export function VoucherTable(props: VoucherTableProps) {
  const { t, vouchers, statsByVoucherId, loading, onEdit, onToggleActive, onDelete } = props;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
            <th className="py-3 pr-4">{t('admin.vouchers.table.code')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.type')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.value')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.validity')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.quota')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.used')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.remaining')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.redemptions')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.discountTotal')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.status')}</th>
            <th className="py-3 pr-4">{t('admin.vouchers.table.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={11} className="py-6 text-center text-sm text-gray-500">
                {t('admin.vouchers.loading')}
              </td>
            </tr>
          ) : vouchers.length === 0 ? (
            <tr>
              <td colSpan={11} className="py-6 text-center text-sm text-gray-500">
                {t('admin.vouchers.empty')}
              </td>
            </tr>
          ) : (
            vouchers.map((voucher) => {
              const status = statusLabel(voucher);
              const stats = statsByVoucherId[voucher.id] || { redemptions: 0, discountTotal: 0 };
              const remaining = Math.max(0, voucher.quota - voucher.used_count);
              return (
                <tr key={voucher.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-mono text-xs text-gray-900">{voucher.code}</td>
                  <td className="py-3 pr-4 capitalize">{t(`admin.vouchers.types.${voucher.discount_type}`)}</td>
                  <td className="py-3 pr-4">{discountValueLabel(voucher)}</td>
                  <td className="py-3 pr-4 text-xs text-gray-600">{formatValidity(voucher)}</td>
                  <td className="py-3 pr-4">{voucher.quota}</td>
                  <td className="py-3 pr-4">{voucher.used_count}</td>
                  <td className="py-3 pr-4">{remaining}</td>
                  <td className="py-3 pr-4">{stats.redemptions}</td>
                  <td className="py-3 pr-4">{formatCurrency(stats.discountTotal)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : status === 'expired'
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {t(`admin.vouchers.status.${status}`)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => onEdit(voucher)} className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        {t('admin.vouchers.actions.edit')}
                      </button>
                      <button
                        onClick={() => onToggleActive(voucher)}
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          voucher.is_active ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {voucher.is_active ? t('admin.vouchers.actions.deactivate') : t('admin.vouchers.actions.activate')}
                      </button>
                      <button onClick={() => onDelete(voucher)} className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                        {t('admin.vouchers.actions.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
