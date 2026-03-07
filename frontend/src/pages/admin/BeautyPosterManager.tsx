import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { slugify } from '../../utils/merchant';
import { BeautyPosterActionBar } from './beauty-poster-manager/BeautyPosterActionBar';
import { BeautyPosterCanvasSection } from './beauty-poster-manager/BeautyPosterCanvasSection';
import { BeautyPosterEditorForm } from './beauty-poster-manager/BeautyPosterEditorForm';
import { BeautyPosterSidebar } from './beauty-poster-manager/BeautyPosterSidebar';
import { BeautyPosterUrlModal } from './beauty-poster-manager/BeautyPosterUrlModal';
import { useBeautyPosterManagerController } from './beauty-poster-manager/useBeautyPosterManagerController';

export default function BeautyPosterManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const controller = useBeautyPosterManagerController(showToast);
  const {
    loading,
    saving,
    posters,
    selectedPoster,
    title,
    slug,
    imageUrl,
    isActive,
    showUrlModal,
    urlDraft,
    tags,
    productSearch,
    searchingProducts,
    productResults,
    activeDragPreview,
    isDraggingAny,
    sensors,
    canvasRef,
    uploadInputRef,
    editorTitle,
    isDirty,
    setTitle,
    setSlug,
    setIsActive,
    setShowUrlModal,
    setUrlDraft,
    setTags,
    openEditor,
    searchProducts,
    handleUploadImage,
    handleSelectVariant,
    handleTagPointerDown,
    handleTagPointerMove,
    handleTagPointerUp,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    applyChanges,
    resetEditor,
    handleApplyUrl,
    handleDragStart,
    handleDragComplete,
    handleDragCancel,
  } = controller;

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="beauty-posters"
      title="Beauty Poster Manager"
      subtitle="WYSIWYG poster + product tagger for /beauty"
      onLogout={signOut}
    >
      <div className="space-y-5 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            <BeautyPosterEditorForm
              loading={loading}
              saving={saving}
              posters={posters}
              selectedPoster={selectedPoster}
              title={title}
              slug={slug}
              isActive={isActive}
              uploadInputRef={uploadInputRef}
              onOpenEditor={(poster) => void openEditor(poster)}
              onChangeTitle={(value) => {
                setTitle(value);
                if (!selectedPoster) setSlug(slugify(value));
              }}
              onChangeSlug={(value) => setSlug(slugify(value))}
              onToggleActive={() => setIsActive((value) => !value)}
              onOpenUrlModal={() => {
                setUrlDraft(imageUrl);
                setShowUrlModal(true);
              }}
              onUploadFile={(file) => void handleUploadImage(file)}
            />

            <BeautyPosterCanvasSection
              imageUrl={imageUrl}
              title={title}
              tags={tags}
              isDraggingAny={isDraggingAny}
              activeDragPreview={activeDragPreview}
              sensors={sensors}
              canvasRef={canvasRef}
              uploadInputRef={uploadInputRef}
              onUploadFile={(file) => void handleUploadImage(file)}
              onOpenUrlModal={() => {
                setUrlDraft(imageUrl);
                setShowUrlModal(true);
              }}
              onTagPointerDown={handleTagPointerDown}
              onTagPointerMove={handleTagPointerMove}
              onTagPointerUp={handleTagPointerUp}
              onResizePointerDown={handleResizePointerDown}
              onResizePointerMove={handleResizePointerMove}
              onResizePointerUp={handleResizePointerUp}
              onDragStart={handleDragStart}
              onDragEnd={handleDragComplete}
              onDragCancel={handleDragCancel}
            />
          </div>

          <BeautyPosterSidebar
            imageUrl={imageUrl}
            tags={tags}
            productSearch={productSearch}
            searchingProducts={searchingProducts}
            productResults={productResults}
            onSearchProducts={(query) => void searchProducts(query)}
            onSelectVariant={handleSelectVariant}
            onChangeTagLabel={(variantId, value) =>
              setTags((current) =>
                current.map((tag) => (tag.product_variant_id === variantId ? { ...tag, label: value } : tag))
              )
            }
            onRemoveTag={(variantId) =>
              setTags((current) => current.filter((tag) => tag.product_variant_id !== variantId))
            }
          />
        </div>

        <BeautyPosterUrlModal
          open={showUrlModal}
          urlDraft={urlDraft}
          onChangeUrl={setUrlDraft}
          onClose={() => setShowUrlModal(false)}
          onApply={handleApplyUrl}
        />

        <BeautyPosterActionBar
          editorTitle={editorTitle}
          saving={saving}
          isDirty={isDirty}
          onCancel={() => {
            void resetEditor();
          }}
          onApply={() => {
            void applyChanges().then((updated) => {
              if (updated) showToast('success', 'Applied');
            });
          }}
          onSave={() => {
            void applyChanges().then((updated) => {
              if (updated) showToast('success', 'Saved');
            });
          }}
        />
      </div>
    </AdminLayout>
  );
}
