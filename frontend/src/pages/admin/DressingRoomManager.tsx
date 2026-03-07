import { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { DressingRoomCollectionsView } from './dressing-room-manager/DressingRoomCollectionsView';
import { DressingRoomEditorView } from './dressing-room-manager/DressingRoomEditorView';
import { useDressingRoomManagerController } from './dressing-room-manager/useDressingRoomManagerController';

// ─── Component ──────────────────────────────────────────────────────────
export default function DressingRoomManager() {
    const { signOut } = useAuth();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const controller = useDressingRoomManagerController(showToast);
    const {
        view, collections, selectedCollection, looks, loading, saving, formTitle, formDescription, showCreateForm,
        uploadingLookId, pendingUpload, containerWidth, isDragging, editingModelName, modelNameValue,
        editingCollectionInfo, collectionTitle, collectionDesc, productSearch, productResults, searchingProducts, showProductPicker,
        setView, setSelectedCollection, setFormTitle, setFormDescription, setShowCreateForm, setPendingUpload, setIsDragging,
        setEditingModelName, setModelNameValue, setEditingCollectionInfo, setCollectionTitle, setCollectionDesc, setShowProductPicker,
        handleCreateCollection, handleToggleActive, handleDeleteCollection, openEditor, handleSaveCollectionInfo, handleAddLook, handleAddPhoto,
        handleReplacePhoto, handleDeletePhoto, handleSaveModelName, handleDeleteLook, searchProducts, handleLinkProduct, handleUnlinkProduct,
        containerRef, getActivePhotoIndex, setActivePhotoIndex, goPhotoNext, goPhotoPrev, handleDragEnd,
    } = controller;

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <AdminLayout
            title="Dressing Room"
            subtitle="Kelola koleksi dressing room"
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={ADMIN_MENU_SECTIONS}
            defaultActiveMenuId="dressing-room"
            onLogout={signOut}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept=".png,image/png"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && pendingUpload) {
                        if (pendingUpload.kind === 'add-photo') void handleAddPhoto(pendingUpload.lookId, f);
                        if (pendingUpload.kind === 'replace-photo') void handleReplacePhoto(pendingUpload.lookId, pendingUpload.photoId, pendingUpload.previousUrl, f);
                    }
                    e.target.value = '';
                    setPendingUpload(null);
                }}
            />

            {view === 'list' ? (
                <DressingRoomCollectionsView
                    loading={loading}
                    saving={saving}
                    collections={collections}
                    showCreateForm={showCreateForm}
                    formTitle={formTitle}
                    formDescription={formDescription}
                    onToggleCreateForm={() => setShowCreateForm(!showCreateForm)}
                    onChangeFormTitle={setFormTitle}
                    onChangeFormDescription={setFormDescription}
                    onCreateCollection={() => void handleCreateCollection()}
                    onToggleActive={(collection) => void handleToggleActive(collection)}
                    onOpenEditor={openEditor}
                    onDeleteCollection={(collectionId) => void handleDeleteCollection(collectionId)}
                />
            ) : (
                <DressingRoomEditorView
                    selectedCollection={selectedCollection}
                    looks={looks}
                    fileInputRef={fileInputRef}
                    pendingUpload={pendingUpload}
                    editingCollectionInfo={editingCollectionInfo}
                    collectionTitle={collectionTitle}
                    collectionDesc={collectionDesc}
                    editingModelName={editingModelName}
                    modelNameValue={modelNameValue}
                    showProductPicker={showProductPicker}
                    productSearch={productSearch}
                    productResults={productResults}
                    searchingProducts={searchingProducts}
                    uploadingLookId={uploadingLookId}
                    containerWidth={containerWidth}
                    isDragging={isDragging}
                    getActivePhotoIndex={getActivePhotoIndex}
                    setActivePhotoIndex={setActivePhotoIndex}
                    onBack={() => { setView('list'); setSelectedCollection(null); setEditingCollectionInfo(false); }}
                    onChangeCollectionTitle={setCollectionTitle}
                    onChangeCollectionDesc={setCollectionDesc}
                    onToggleEditingCollectionInfo={(value) => {
                        setEditingCollectionInfo(value);
                        if (!value) {
                            setCollectionTitle(selectedCollection?.title || '');
                            setCollectionDesc(selectedCollection?.description || '');
                        }
                    }}
                    onSaveCollectionInfo={() => void handleSaveCollectionInfo()}
                    onAddLook={() => void handleAddLook()}
                    onPrepareUpload={setPendingUpload}
                    onDeleteLook={(lookId, imageUrl) => void handleDeleteLook(lookId, imageUrl)}
                    onSetEditingModelName={setEditingModelName}
                    onSetModelNameValue={setModelNameValue}
                    onSaveModelName={(lookId) => void handleSaveModelName(lookId)}
                    onToggleProductPicker={() => setShowProductPicker(!showProductPicker)}
                    onSearchProducts={(query) => void searchProducts(query)}
                    onLinkProduct={(lookId, variantId) => void handleLinkProduct(lookId, variantId)}
                    onUnlinkProduct={(itemId) => void handleUnlinkProduct(itemId)}
                    onDeletePhoto={(photoId, imageUrl) => void handleDeletePhoto(photoId, imageUrl)}
                    onGoPhotoPrev={goPhotoPrev}
                    onGoPhotoNext={goPhotoNext}
                    onContainerRef={containerRef}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={handleDragEnd}
                />
            )}
        </AdminLayout>
    );
}
