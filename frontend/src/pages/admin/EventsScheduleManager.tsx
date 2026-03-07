import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { EventsScheduleEditorPanel } from './events-schedule-manager/EventsScheduleEditorPanel';
import { EventsScheduleItemsPanel } from './events-schedule-manager/EventsScheduleItemsPanel';
import { EventsScheduleOrderPanel } from './events-schedule-manager/EventsScheduleOrderPanel';
import { useEventsScheduleManagerController } from './events-schedule-manager/useEventsScheduleManagerController';

export default function EventsScheduleManager() {
  const { signOut, isAdmin } = useAuth();
  const { showToast } = useToast();
  const controller = useEventsScheduleManagerController(showToast);
  const {
    isLoading,
    error,
    searchQuery,
    editingItem,
    form,
    saving,
    uploading,
    orderItems,
    hasUnsavedOrder,
    applyingOrder,
    filteredItems,
    previewItem,
    setSearchQuery,
    setForm,
    resetEditor,
    handleEdit,
    handleSave,
    handleDelete,
    handleToggleActive,
    handleUploadImageFile,
    handleOrderChange,
    handleApplyOrder,
    handleCancelOrder,
  } = controller;

  if (!isAdmin && !isLoading) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={ADMIN_MENU_SECTIONS}
        defaultActiveMenuId="events-schedule"
        title="Events Schedule Manager"
        onLogout={signOut}
      >
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined mb-4 text-6xl text-red-500">block</span>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="text-gray-600">You need admin privileges to view this page.</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="events-schedule"
      title="Events Schedule Manager"
      subtitle="WYSIWYG editor for Upcoming Schedule on /events"
      headerActions={
        <button
          type="button"
          onClick={resetEditor}
          className="flex items-center gap-2 rounded-lg bg-[#ff4b86] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a]"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Item
        </button>
      }
      onLogout={signOut}
    >
      {error ? (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-sm text-red-700">{error instanceof Error ? error.message : 'Failed to load schedule items'}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <EventsScheduleItemsPanel
            searchQuery={searchQuery}
            filteredItems={filteredItems}
            editingItemId={editingItem?.id ?? null}
            onChangeSearch={setSearchQuery}
            onEdit={handleEdit}
            onDelete={(item) => void handleDelete(item)}
            onToggleActive={(item) => void handleToggleActive(item)}
          />

          <EventsScheduleOrderPanel
            orderItems={orderItems}
            hasUnsavedOrder={hasUnsavedOrder}
            applyingOrder={applyingOrder}
            onOrderChange={handleOrderChange}
            onApplyOrder={() => void handleApplyOrder()}
            onCancelOrder={handleCancelOrder}
          />
        </div>

        <div className="space-y-6 lg:col-span-5">
          <EventsScheduleEditorPanel
            previewItem={previewItem}
            editingItem={editingItem}
            form={form}
            saving={saving}
            uploading={uploading}
            setForm={setForm}
            onUploadImageFile={(file) => void handleUploadImageFile(file)}
            onSave={() => void handleSave()}
            onReset={resetEditor}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
