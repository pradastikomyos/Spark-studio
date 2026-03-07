import type { TFunction } from 'i18next';
import type { CategoryRow, VoucherFormState, VoucherRow } from './voucherManagerTypes';

type VoucherFormModalProps = {
  t: TFunction;
  open: boolean;
  editingVoucher: VoucherRow | null;
  formState: VoucherFormState;
  formError: string | null;
  saving: boolean;
  visibleCategories: CategoryRow[];
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onChange: (key: keyof VoucherFormState, value: string | boolean | number[]) => void;
  onToggleCategory: (id: number) => void;
};

export function VoucherFormModal(props: VoucherFormModalProps) {
  const { t, open, editingVoucher, formState, formError, saving, visibleCategories, onClose, onSubmit, onChange, onToggleCategory } = props;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto animate-fade-in-scale" onClick={(event) => event.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-900">
            {editingVoucher ? t('admin.vouchers.form.editTitle') : t('admin.vouchers.form.createTitle')}
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{formError}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="voucher-code" className="block text-sm font-bold text-gray-900 mb-2">
                {t('admin.vouchers.form.code')}
              </label>
              <input
                id="voucher-code"
                type="text"
                value={formState.code}
                onChange={(event) => onChange('code', event.target.value.toUpperCase())}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder={t('admin.vouchers.form.codePlaceholder')}
                required
              />
            </div>
            <div>
              <label htmlFor="voucher-type" className="block text-sm font-bold text-gray-900 mb-2">
                {t('admin.vouchers.form.type')}
              </label>
              <select
                id="voucher-type"
                value={formState.discount_type}
                onChange={(event) => onChange('discount_type', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              >
                <option value="percentage">{t('admin.vouchers.types.percentage')}</option>
                <option value="fixed">{t('admin.vouchers.types.fixed')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="voucher-value" className="block text-sm font-bold text-gray-900 mb-2">
                {t('admin.vouchers.form.value')}
              </label>
              <input
                id="voucher-value"
                type="number"
                min="0"
                step="0.01"
                value={formState.discount_value}
                onChange={(event) => onChange('discount_value', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="voucher-quota" className="block text-sm font-bold text-gray-900 mb-2">
                {t('admin.vouchers.form.quota')}
              </label>
              <input
                id="voucher-quota"
                type="number"
                min="1"
                value={formState.quota}
                onChange={(event) => onChange('quota', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="voucher-valid-from" className="block text-sm font-bold text-gray-900 mb-2">
                {t('admin.vouchers.form.validFrom')}
              </label>
              <input
                id="voucher-valid-from"
                type="datetime-local"
                value={formState.valid_from}
                onChange={(event) => onChange('valid_from', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="voucher-valid-until" className="block text-sm font-bold text-gray-900 mb-2">
                {t('admin.vouchers.form.validUntil')}
              </label>
              <input
                id="voucher-valid-until"
                type="datetime-local"
                value={formState.valid_until}
                onChange={(event) => onChange('valid_until', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="voucher-min-purchase" className="block text-sm font-bold text-gray-900 mb-2">
                {t('admin.vouchers.form.minPurchase')}
              </label>
              <input
                id="voucher-min-purchase"
                type="number"
                min="0"
                step="0.01"
                value={formState.min_purchase}
                onChange={(event) => onChange('min_purchase', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder={t('admin.vouchers.form.optional')}
              />
            </div>
            <div>
              <label htmlFor="voucher-max-discount" className="block text-sm font-bold text-gray-900 mb-2">
                {t('admin.vouchers.form.maxDiscount')}
              </label>
              <input
                id="voucher-max-discount"
                type="number"
                min="0"
                step="0.01"
                value={formState.max_discount}
                onChange={(event) => onChange('max_discount', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder={t('admin.vouchers.form.optional')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.categories')}</label>
            <p className="text-xs text-gray-500 mb-3">{t('admin.vouchers.form.categoriesHint')}</p>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 p-3 space-y-2">
              {visibleCategories.length === 0 ? (
                <span className="text-xs text-gray-500">{t('admin.vouchers.form.noCategories')}</span>
              ) : (
                visibleCategories.map((category) => (
                  <label key={category.id} className="flex items-center gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formState.applicable_categories.includes(category.id)}
                      onChange={() => onToggleCategory(category.id)}
                      className="h-4 w-4 rounded border-gray-300 text-main-600 focus:ring-main-500"
                    />
                    <span>{category.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">{t('admin.vouchers.form.active')}</span>
            <button
              type="button"
              onClick={() => onChange('is_active', !formState.is_active)}
              className={`inline-flex h-7 w-12 items-center rounded-full px-1 transition-colors ${
                formState.is_active ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
              aria-pressed={formState.is_active}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                  formState.is_active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="sr-only">{formState.is_active ? t('admin.vouchers.form.activeOn') : t('admin.vouchers.form.activeOff')}</span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              {t('admin.vouchers.actions.cancel')}
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-main-600 px-4 py-2 text-sm font-bold text-white hover:bg-main-700 disabled:opacity-60">
              {saving ? t('admin.vouchers.actions.saving') : t('admin.vouchers.actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
