import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useSessionRefresh } from '../../hooks/useSessionRefresh';
import { formatCurrency } from '../../utils/formatters';

type VoucherRow = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  quota: number;
  used_count: number;
  min_purchase: number | null;
  max_discount: number | null;
  applicable_categories: number[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: number;
  name: string;
  is_active: boolean | null;
};

type VoucherStats = {
  redemptions: number;
  discountTotal: number;
};

type VoucherFormState = {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  valid_from: string;
  valid_until: string;
  quota: string;
  min_purchase: string;
  max_discount: string;
  applicable_categories: number[];
  is_active: boolean;
};

const emptyForm = (): VoucherFormState => ({
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  valid_from: '',
  valid_until: '',
  quota: '',
  min_purchase: '',
  max_discount: '',
  applicable_categories: [],
  is_active: true,
});

const toInputDateTime = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function VoucherManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  useSessionRefresh();

  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [statsByVoucherId, setStatsByVoucherId] = useState<Record<string, VoucherStats>>({});
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherRow | null>(null);
  const [formState, setFormState] = useState<VoucherFormState>(() => emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const loadCategories = useCallback(async () => {
    const { data, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, is_active')
      .order('name', { ascending: true });
    if (categoriesError) {
      showToast('error', categoriesError.message);
      return;
    }
    setCategories((data || []) as CategoryRow[]);
  }, [showToast]);

  const loadStats = useCallback(async (voucherIds: string[]) => {
    if (voucherIds.length === 0) {
      setStatsByVoucherId({});
      return;
    }
    const { data, error: usageError } = await supabase
      .from('voucher_usage')
      .select('voucher_id, discount_amount')
      .in('voucher_id', voucherIds);
    if (usageError) {
      showToast('error', usageError.message);
      return;
    }

    const stats: Record<string, VoucherStats> = {};
    (data || []).forEach((row) => {
      const voucherId = String((row as { voucher_id?: string }).voucher_id || '');
      if (!voucherId) return;
      const current = stats[voucherId] || { redemptions: 0, discountTotal: 0 };
      const discountAmount = Number((row as { discount_amount?: number | string }).discount_amount ?? 0);
      stats[voucherId] = {
        redemptions: current.redemptions + 1,
        discountTotal: current.discountTotal + discountAmount,
      };
    });
    setStatsByVoucherId(stats);
  }, [showToast]);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const nowIso = new Date().toISOString();
    try {
      let query = supabase
        .from('vouchers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (statusFilter === 'active') {
        query = query.eq('is_active', true).lte('valid_from', nowIso).gte('valid_until', nowIso);
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false);
      } else if (statusFilter === 'expired') {
        query = query.lt('valid_until', nowIso);
      }

      const { data, error: vouchersError, count } = await query;
      if (vouchersError) throw vouchersError;

      const rows = (data || []) as VoucherRow[];
      setVouchers(rows);
      setTotalCount(count ?? 0);
      await loadStats(rows.map((row) => row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.vouchers.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [loadStats, page, pageSize, statusFilter, t]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const statusLabel = (voucher: VoucherRow) => {
    const now = Date.now();
    if (!voucher.is_active) return 'inactive';
    if (new Date(voucher.valid_until).getTime() < now) return 'expired';
    if (new Date(voucher.valid_from).getTime() > now) return 'inactive';
    return 'active';
  };

  const discountValueLabel = (voucher: VoucherRow) => {
    if (voucher.discount_type === 'percentage') {
      return `${voucher.discount_value}%`;
    }
    return formatCurrency(voucher.discount_value);
  };

  const formatValidity = (voucher: VoucherRow) => {
    const from = new Date(voucher.valid_from).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const until = new Date(voucher.valid_until).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return `${from} - ${until}`;
  };

  const openCreateForm = () => {
    setEditingVoucher(null);
    setFormState(emptyForm());
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (voucher: VoucherRow) => {
    setEditingVoucher(voucher);
    setFormState({
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_value: String(voucher.discount_value ?? ''),
      valid_from: toInputDateTime(voucher.valid_from),
      valid_until: toInputDateTime(voucher.valid_until),
      quota: String(voucher.quota ?? ''),
      min_purchase: voucher.min_purchase != null ? String(voucher.min_purchase) : '',
      max_discount: voucher.max_discount != null ? String(voucher.max_discount) : '',
      applicable_categories: voucher.applicable_categories ? [...voucher.applicable_categories] : [],
      is_active: voucher.is_active,
    });
    setFormError(null);
    setShowForm(true);
  };

  const updateForm = (key: keyof VoucherFormState, value: string | boolean | number[]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (id: number) => {
    setFormState((prev) => {
      const exists = prev.applicable_categories.includes(id);
      const next = exists
        ? prev.applicable_categories.filter((item) => item !== id)
        : [...prev.applicable_categories, id];
      return { ...prev, applicable_categories: next };
    });
  };

  const validateForm = () => {
    const errors: string[] = [];
    if (!formState.code.trim()) errors.push(t('admin.vouchers.form.errors.code'));
    if (!formState.discount_value || Number(formState.discount_value) <= 0) {
      errors.push(t('admin.vouchers.form.errors.discountValue'));
    }
    if (!formState.valid_from || !formState.valid_until) {
      errors.push(t('admin.vouchers.form.errors.validity'));
    } else if (new Date(formState.valid_until) <= new Date(formState.valid_from)) {
      errors.push(t('admin.vouchers.form.errors.dateRange'));
    }
    if (!formState.quota || Number(formState.quota) <= 0) {
      errors.push(t('admin.vouchers.form.errors.quota'));
    }
    if (formState.min_purchase && Number(formState.min_purchase) < 0) {
      errors.push(t('admin.vouchers.form.errors.minPurchase'));
    }
    if (formState.max_discount && Number(formState.max_discount) < 0) {
      errors.push(t('admin.vouchers.form.errors.maxDiscount'));
    }
    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const errors = validateForm();
    if (errors.length > 0) {
      setFormError(errors.join(' '));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: formState.code.trim().toUpperCase(),
        discount_type: formState.discount_type,
        discount_value: Number(formState.discount_value),
        valid_from: new Date(formState.valid_from).toISOString(),
        valid_until: new Date(formState.valid_until).toISOString(),
        quota: Math.floor(Number(formState.quota)),
        min_purchase: formState.min_purchase ? Number(formState.min_purchase) : null,
        max_discount: formState.max_discount ? Number(formState.max_discount) : null,
        applicable_categories: formState.applicable_categories.length > 0 ? formState.applicable_categories : null,
        is_active: formState.is_active,
      };

      if (editingVoucher) {
        const { error: updateError } = await supabase
          .from('vouchers')
          .update(payload)
          .eq('id', editingVoucher.id);
        if (updateError) throw updateError;
        showToast('success', t('admin.vouchers.toast.updateSuccess'));
      } else {
        const { error: insertError } = await supabase.from('vouchers').insert(payload);
        if (insertError) throw insertError;
        showToast('success', t('admin.vouchers.toast.createSuccess'));
      }

      setShowForm(false);
      setEditingVoucher(null);
      setFormState(emptyForm());
      loadVouchers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('admin.vouchers.errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (voucher: VoucherRow) => {
    const confirmed = window.confirm(t('admin.vouchers.confirmDelete'));
    if (!confirmed) return;
    const { error: deleteError } = await supabase.from('vouchers').delete().eq('id', voucher.id);
    if (deleteError) {
      showToast('error', deleteError.message);
      return;
    }
    showToast('success', t('admin.vouchers.toast.deleteSuccess'));
    loadVouchers();
  };

  const handleToggleActive = async (voucher: VoucherRow) => {
    const { error: updateError } = await supabase
      .from('vouchers')
      .update({ is_active: !voucher.is_active })
      .eq('id', voucher.id);
    if (updateError) {
      showToast('error', updateError.message);
      return;
    }
    showToast('success', t('admin.vouchers.toast.toggleSuccess'));
    loadVouchers();
  };

  const visibleCategories = useMemo(() => categories.filter((c) => c.is_active !== false), [categories]);

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="vouchers"
      title={t('admin.vouchers.title')}
      subtitle={t('admin.vouchers.subtitle')}
      onLogout={signOut}
      headerActions={
        <button
          onClick={openCreateForm}
          className="rounded-lg bg-main-600 px-4 py-2 text-xs font-bold text-white hover:bg-main-700"
        >
          {t('admin.vouchers.actions.create')}
        </button>
      }
    >
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t('admin.vouchers.filters.status')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as typeof statusFilter);
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
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
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

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

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
                          <button
                            onClick={() => openEditForm(voucher)}
                            className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            {t('admin.vouchers.actions.edit')}
                          </button>
                          <button
                            onClick={() => handleToggleActive(voucher)}
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              voucher.is_active
                                ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {voucher.is_active ? t('admin.vouchers.actions.deactivate') : t('admin.vouchers.actions.activate')}
                          </button>
                          <button
                            onClick={() => handleDelete(voucher)}
                            className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>
            {t('admin.vouchers.pagination.summary', {
              page,
              total: totalPages,
              count: totalCount,
            })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50"
            >
              {t('admin.vouchers.pagination.prev')}
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50"
            >
              {t('admin.vouchers.pagination.next')}
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {editingVoucher ? t('admin.vouchers.form.editTitle') : t('admin.vouchers.form.createTitle')}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-900">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.code')}</label>
                  <input
                    type="text"
                    value={formState.code}
                    onChange={(e) => updateForm('code', e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    placeholder={t('admin.vouchers.form.codePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.type')}</label>
                  <select
                    value={formState.discount_type}
                    onChange={(e) => updateForm('discount_type', e.target.value as VoucherFormState['discount_type'])}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  >
                    <option value="percentage">{t('admin.vouchers.types.percentage')}</option>
                    <option value="fixed">{t('admin.vouchers.types.fixed')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.value')}</label>
                  <input
                    type="number"
                    value={formState.discount_value}
                    onChange={(e) => updateForm('discount_value', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    min={0}
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.quota')}</label>
                  <input
                    type="number"
                    value={formState.quota}
                    onChange={(e) => updateForm('quota', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.validFrom')}</label>
                  <input
                    type="datetime-local"
                    value={formState.valid_from}
                    onChange={(e) => updateForm('valid_from', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.validUntil')}</label>
                  <input
                    type="datetime-local"
                    value={formState.valid_until}
                    onChange={(e) => updateForm('valid_until', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.minPurchase')}</label>
                  <input
                    type="number"
                    value={formState.min_purchase}
                    onChange={(e) => updateForm('min_purchase', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    min={0}
                    step="0.01"
                    placeholder={t('admin.vouchers.form.optional')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.maxDiscount')}</label>
                  <input
                    type="number"
                    value={formState.max_discount}
                    onChange={(e) => updateForm('max_discount', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    min={0}
                    step="0.01"
                    placeholder={t('admin.vouchers.form.optional')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{t('admin.vouchers.form.categories')}</label>
                <p className="text-xs text-gray-500 mb-3">{t('admin.vouchers.form.categoriesHint')}</p>
                <div className="flex flex-wrap gap-2">
                  {visibleCategories.length === 0 ? (
                    <span className="text-xs text-gray-500">{t('admin.vouchers.form.noCategories')}</span>
                  ) : (
                    visibleCategories.map((category) => {
                      const checked = formState.applicable_categories.includes(category.id);
                      return (
                        <label
                          key={category.id}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
                            checked ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(category.id)}
                            className="h-3 w-3"
                          />
                          {category.name}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">{t('admin.vouchers.form.active')}</label>
                <button
                  type="button"
                  onClick={() => updateForm('is_active', !formState.is_active)}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                    formState.is_active ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {formState.is_active ? t('admin.vouchers.form.activeOn') : t('admin.vouchers.form.activeOff')}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  {t('admin.vouchers.actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-main-600 px-4 py-2 text-sm font-bold text-white hover:bg-main-700 disabled:opacity-60"
                >
                  {saving ? t('admin.vouchers.actions.saving') : t('admin.vouchers.actions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
