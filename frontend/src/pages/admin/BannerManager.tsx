import AdminLayout from '../../components/AdminLayout';
import BrandedLoader from '../../components/BrandedLoader';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { BannerFormModal } from './banner-manager/BannerFormModal';
import { BannerTypeSection } from './banner-manager/BannerTypeSection';
import { bannerTypeOrder } from './banner-manager/bannerManagerHelpers';
import { useBannerManagerController } from './banner-manager/useBannerManagerController';

export default function BannerManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const controller = useBannerManagerController(showToast);
  const {
    loading,
    showForm,
    editingBanner,
    uploading,
    uploadingTitle,
    saving,
    formData,
    groupedBanners,
    hasUnsavedChanges,
    applyingOrder,
    setFormData,
    openCreateForm,
    closeForm,
    handleImageUpload,
    handleTitleImageUpload,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleToggleActive,
    handleStageOrderChange,
    handleApplyOrder,
    handleCancelOrder,
  } = controller;

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="banner-manager"
      title="Banner Manager"
      subtitle="Manage hero, stage, shop, and event banners"
      headerActions={
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center gap-2 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a]"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Banner
        </button>
      }
      onLogout={signOut}
    >
      {loading ? (
        <BrandedLoader text="Loading banners..." size="md" className="h-64" />
      ) : (
        <div className="space-y-8">
          {bannerTypeOrder.map((type) => (
            <BannerTypeSection
              key={type}
              type={type}
              banners={groupedBanners[type]}
              hasUnsavedChanges={hasUnsavedChanges}
              applyingOrder={applyingOrder}
              onEdit={handleEdit}
              onToggleActive={(banner) => void handleToggleActive(banner)}
              onDelete={(id) => void handleDelete(id)}
              onStageOrderChange={handleStageOrderChange}
              onApplyOrder={() => void handleApplyOrder()}
              onCancelOrder={handleCancelOrder}
            />
          ))}
        </div>
      )}

      <BannerFormModal
        open={showForm}
        editingBanner={editingBanner}
        formData={formData}
        uploading={uploading}
        uploadingTitle={uploadingTitle}
        saving={saving}
        setFormData={setFormData}
        onClose={closeForm}
        onSubmit={(event) => void handleSubmit(event)}
        onImageUpload={(event) => void handleImageUpload(event)}
        onTitleImageUpload={(event) => void handleTitleImageUpload(event)}
      />
    </AdminLayout>
  );
}
