import { useTranslation } from 'react-i18next';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { VoucherFormModal } from './voucher-manager/VoucherFormModal';
import { VoucherPagination } from './voucher-manager/VoucherPagination';
import { VoucherTable } from './voucher-manager/VoucherTable';
import { VoucherToolbar } from './voucher-manager/VoucherToolbar';
import { useVoucherManagerController } from './voucher-manager/useVoucherManagerController';

export default function VoucherManager() {
  const { signOut } = useAuth();
  const { t } = useTranslation();

  const {
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
  } = useVoucherManagerController();

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="vouchers"
      title={t('admin.vouchers.title')}
      subtitle={t('admin.vouchers.subtitle')}
      onLogout={signOut}
      headerActions={
        <VoucherToolbar
          t={t}
          pageSize={pageSize}
          statusFilter={statusFilter}
          onOpenCreate={openCreateForm}
          onSetPageSize={setPageSize}
          onSetStatusFilter={setStatusFilter}
          onResetPage={() => setPage(1)}
        />
      }
    >
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <VoucherTable
          t={t}
          vouchers={vouchers}
          statsByVoucherId={statsByVoucherId}
          loading={loading}
          onEdit={openEditForm}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />

        <VoucherPagination
          t={t}
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPrev={() => setPage((prev) => Math.max(1, prev - 1))}
          onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        />
      </div>

      <VoucherFormModal
        t={t}
        open={showForm}
        editingVoucher={editingVoucher}
        formState={formState}
        formError={formError}
        saving={saving}
        visibleCategories={visibleCategories}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        onChange={updateForm}
        onToggleCategory={toggleCategory}
      />
    </AdminLayout>
  );
}
