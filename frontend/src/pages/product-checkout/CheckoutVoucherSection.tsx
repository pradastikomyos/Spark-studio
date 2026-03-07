import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';
import type { AppliedVoucher } from './checkoutTypes';

type CheckoutVoucherSectionProps = {
  voucherCode: string;
  appliedVoucher: AppliedVoucher | null;
  voucherError: string | null;
  loading: boolean;
  applyingVoucher: boolean;
  onChangeVoucherCode: (value: string) => void;
  onApplyVoucher: () => void;
  onRemoveVoucher: () => void;
};

export function CheckoutVoucherSection({
  voucherCode,
  appliedVoucher,
  voucherError,
  loading,
  applyingVoucher,
  onChangeVoucherCode,
  onApplyVoucher,
  onRemoveVoucher,
}: CheckoutVoucherSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-amber-900">{t('voucher.label')}</p>
        {appliedVoucher && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
            {t('voucher.applied')}
          </span>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={voucherCode}
          onChange={(event) => onChangeVoucherCode(event.target.value.toUpperCase())}
          className="flex-1 rounded-lg border border-amber-200 bg-white text-sm py-3 px-4 outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
          placeholder={t('voucher.placeholder')}
          disabled={loading || applyingVoucher}
        />
        <button
          onClick={onApplyVoucher}
          disabled={loading || applyingVoucher || !voucherCode.trim()}
          className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:bg-amber-200 disabled:cursor-not-allowed"
        >
          {applyingVoucher ? t('voucher.applying') : t('voucher.apply')}
        </button>
      </div>
      {voucherError && <p className="mt-2 text-xs text-red-600">{voucherError}</p>}
      {appliedVoucher && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800">
          <span>
            {t('voucher.success', {
              code: appliedVoucher.code,
              amount: formatCurrency(appliedVoucher.discountAmount),
            })}
          </span>
          <button onClick={onRemoveVoucher} className="text-amber-700 underline hover:text-amber-900">
            {t('voucher.remove')}
          </button>
        </div>
      )}
    </div>
  );
}
