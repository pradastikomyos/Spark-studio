import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import { emptyForm, toInputDateTime, toVoucherPayload, validateVoucherForm } from './voucherForm';
import type {
  CategoryRow,
  VoucherFormState,
  VoucherRow,
  VoucherStats,
  VoucherStatusFilter,
} from './voucherManagerTypes';

export function useVoucherManagerController() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [statsByVoucherId, setStatsByVoucherId] = useState<Record<string, VoucherStats>>({});
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<VoucherStatusFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherRow | null>(null);
  const [formState, setFormState] = useState<VoucherFormState>(() => emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const loadCategories = useCallback(async () => {
    const { data, error: categoriesError } = await supabase.from('categories').select('id, name, is_active').order('name', { ascending: true });
    if (categoriesError) {
      showToast('error', categoriesError.message);
      return;
    }
    setCategories((data || []) as CategoryRow[]);
  }, [showToast]);

  const loadStats = useCallback(
    async (voucherIds: string[]) => {
      if (voucherIds.length === 0) {
        setStatsByVoucherId({});
        return;
      }

      const { data, error: usageError } = await supabase.from('voucher_usage').select('voucher_id, discount_amount').in('voucher_id', voucherIds);
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
    },
    [showToast]
  );

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
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t('admin.vouchers.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [loadStats, page, pageSize, statusFilter, t]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadVouchers();
  }, [loadVouchers]);

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
      const next = exists ? prev.applicable_categories.filter((item) => item !== id) : [...prev.applicable_categories, id];
      return { ...prev, applicable_categories: next };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const errors = validateVoucherForm(formState, t);
    if (errors.length > 0) {
      setFormError(errors.join(' '));
      return;
    }

    setSaving(true);
    try {
      const payload = toVoucherPayload(formState);

      if (editingVoucher) {
        const { error: updateError } = await supabase.from('vouchers').update(payload).eq('id', editingVoucher.id);
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
      await loadVouchers();
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : t('admin.vouchers.errors.saveFailed'));
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
    await loadVouchers();
  };

  const handleToggleActive = async (voucher: VoucherRow) => {
    const { error: updateError } = await supabase.from('vouchers').update({ is_active: !voucher.is_active }).eq('id', voucher.id);
    if (updateError) {
      showToast('error', updateError.message);
      return;
    }
    showToast('success', t('admin.vouchers.toast.toggleSuccess'));
    await loadVouchers();
  };

  const visibleCategories = useMemo(() => categories.filter((category) => category.is_active !== false), [categories]);

  return {
    vouchers,
    statsByVoucherId,
    visibleCategories,
    loading,
    error,
    page,
    pageSize,
    totalCount,
    totalPages,
    statusFilter,
    showForm,
    editingVoucher,
    formState,
    formError,
    saving,
    setPage,
    setPageSize,
    setStatusFilter,
    setShowForm,
    openCreateForm,
    openEditForm,
    updateForm,
    toggleCategory,
    handleSubmit,
    handleDelete,
    handleToggleActive,
  };
}
