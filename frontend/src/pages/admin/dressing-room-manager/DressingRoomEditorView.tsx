import type { RefObject } from 'react';
import { AnimatePresence, LazyMotion, m, type PanInfo } from 'framer-motion';
import { getOptimizedDressingRoomImageUrl, normalizeDressingRoomImageUrl } from '../../../utils/dressingRoomImageUrl';
import { DRESSING_ROOM_SPRING, formatPrice, getModelTransform } from './dressingRoomManagerHelpers';
import type {
  DressingRoomCollection,
  DressingRoomLook,
  PendingUpload,
  ProductVariantOption,
} from './dressingRoomManagerTypes';

type DressingRoomEditorViewProps = {
  selectedCollection: DressingRoomCollection | null;
  looks: DressingRoomLook[];
  fileInputRef: RefObject<HTMLInputElement>;
  pendingUpload: PendingUpload | null;
  editingCollectionInfo: boolean;
  collectionTitle: string;
  collectionDesc: string;
  editingModelName: boolean;
  modelNameValue: string;
  showProductPicker: boolean;
  productSearch: string;
  productResults: ProductVariantOption[];
  searchingProducts: boolean;
  uploadingLookId: number | null;
  containerWidth: number;
  isDragging: boolean;
  getActivePhotoIndex: (lookId: number) => number;
  setActivePhotoIndex: (lookId: number, index: number) => void;
  onBack: () => void;
  onChangeCollectionTitle: (value: string) => void;
  onChangeCollectionDesc: (value: string) => void;
  onToggleEditingCollectionInfo: (value: boolean) => void;
  onSaveCollectionInfo: () => void;
  onAddLook: () => void;
  onPrepareUpload: (upload: PendingUpload) => void;
  onDeleteLook: (lookId: number, imageUrl: string) => void;
  onSetEditingModelName: (value: boolean) => void;
  onSetModelNameValue: (value: string) => void;
  onSaveModelName: (lookId: number) => void;
  onToggleProductPicker: () => void;
  onSearchProducts: (query: string) => void;
  onLinkProduct: (lookId: number, variantId: number) => void;
  onUnlinkProduct: (itemId: number) => void;
  onDeletePhoto: (photoId: number, imageUrl: string) => void;
  onGoPhotoPrev: (lookId: number) => void;
  onGoPhotoNext: (lookId: number, maxIndex: number) => void;
  onContainerRef: (node: HTMLDivElement | null) => (() => void) | void;
  onDragStart: () => void;
  onDragEnd: (lookId: number, maxIndex: number) => (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
};

export function DressingRoomEditorView(props: DressingRoomEditorViewProps) {
  const {
    selectedCollection,
    looks,
    fileInputRef,
    editingCollectionInfo,
    collectionTitle,
    collectionDesc,
    editingModelName,
    modelNameValue,
    showProductPicker,
    productSearch,
    productResults,
    searchingProducts,
    uploadingLookId,
    containerWidth,
    isDragging,
    getActivePhotoIndex,
    setActivePhotoIndex,
    onBack,
    onChangeCollectionTitle,
    onChangeCollectionDesc,
    onToggleEditingCollectionInfo,
    onSaveCollectionInfo,
    onAddLook,
    onPrepareUpload,
    onDeleteLook,
    onSetEditingModelName,
    onSetModelNameValue,
    onSaveModelName,
    onToggleProductPicker,
    onSearchProducts,
    onLinkProduct,
    onUnlinkProduct,
    onDeletePhoto,
    onGoPhotoPrev,
    onGoPhotoNext,
    onContainerRef,
    onDragStart,
    onDragEnd,
  } = props;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-900 transition-colors mt-0.5">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          {editingCollectionInfo ? (
            <div className="space-y-2">
              <input
                type="text"
                value={collectionTitle}
                onChange={(event) => onChangeCollectionTitle(event.target.value)}
                placeholder="Judul koleksi"
                autoFocus
                className="w-full px-3 py-2 text-lg font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <textarea
                value={collectionDesc}
                onChange={(event) => onChangeCollectionDesc(event.target.value)}
                placeholder="Deskripsi koleksi (opsional)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
              <div className="flex gap-2">
                <button onClick={onSaveCollectionInfo} className="px-4 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  Simpan
                </button>
                <button
                  onClick={() => onToggleEditingCollectionInfo(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="group cursor-pointer text-left"
              onClick={() => onToggleEditingCollectionInfo(true)}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">{selectedCollection?.title}</h2>
                <span className="material-symbols-outlined text-sm text-gray-300 group-hover:text-gray-600 transition-colors">edit</span>
              </div>
              {selectedCollection?.description ? (
                <p className="text-xs text-gray-400 mt-0.5 max-w-lg">{selectedCollection.description}</p>
              ) : (
                <p className="text-xs text-gray-300 mt-0.5 group-hover:text-gray-500">+ Tambah deskripsi</p>
              )}
            </button>
          )}
        </div>
        <button onClick={onAddLook} className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0">
          + Tambah Look
        </button>
      </div>

      {looks.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl py-20 text-center">
          <span className="material-symbols-outlined text-5xl text-gray-300 block mb-3">styler</span>
          <p className="text-gray-500 text-sm mb-3">Belum ada looks. Tambah look pertama!</p>
          <button onClick={onAddLook} className="px-6 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
            + Tambah Look
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {looks.map((look) => {
            const activePhotoIndex = getActivePhotoIndex(look.id);
            const activePhotos = (look.photos ?? []).filter((photo) => (photo.image_url ?? '').trim().length > 0);
            const activePhoto = activePhotos[activePhotoIndex] ?? null;
            const visiblePhotos = activePhotos
              .map((photo, index) => ({ photo, index, offset: index - activePhotoIndex }))
              .filter(({ offset }) => offset >= 0 && offset <= 3);

            return (
              <div key={look.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-gray-800 uppercase tracking-wide">LOOK {String(look.look_number).padStart(2, '0')}</h3>
                    {editingModelName && modelNameValue === (look.model_name || '') ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={modelNameValue}
                          onChange={(event) => onSetModelNameValue(event.target.value)}
                          placeholder="Nama model"
                          autoFocus
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') onSaveModelName(look.id);
                            if (event.key === 'Escape') onSetEditingModelName(false);
                          }}
                          className="px-2 py-0.5 text-xs border border-gray-300 rounded w-28 focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                        <button onClick={() => onSaveModelName(look.id)} className="text-emerald-600 text-[10px] font-bold">✓</button>
                      </div>
                    ) : (
                      <button onClick={() => { onSetEditingModelName(true); onSetModelNameValue(look.model_name || ''); }} className="text-[11px] text-gray-400 hover:text-gray-700">
                        {look.model_name || '+ Tambah nama model'}
                      </button>
                    )}
                  </div>
                  <button onClick={() => onDeleteLook(look.id, look.model_image_url)} className="text-gray-300 hover:text-red-500 transition-colors" title="Hapus look ini">
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>

                <div className="flex gap-5 p-5">
                  <div className="flex-1 min-w-0 bg-[#f5f3f0] rounded-xl overflow-hidden flex flex-col" style={{ minHeight: '480px' }}>
                    <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
                      <m.div
                        ref={onContainerRef}
                        className="relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.08}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd(look.id, activePhotos.length - 1)}
                        style={{ touchAction: 'pan-y' }}
                      >
                        {activePhotos.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center px-6">
                            <button
                              type="button"
                              onClick={() => { onPrepareUpload({ kind: 'add-photo', lookId: look.id }); fileInputRef.current?.click(); }}
                              className="w-full max-w-sm bg-white/80 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-white transition-colors py-10"
                            >
                              {uploadingLookId === look.id ? (
                                <span className="text-sm text-gray-500 animate-pulse">Uploading...</span>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-3xl text-gray-300">cloud_upload</span>
                                  <span className="text-xs font-semibold text-gray-500">Klik untuk upload foto pertama</span>
                                  <span className="text-[10px] text-gray-400">PNG transparan</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <AnimatePresence mode="popLayout">
                            {visiblePhotos.map(({ photo, index, offset }) => {
                              const transform = getModelTransform(offset, containerWidth);
                              if (!transform.display) return null;
                              const isActive = offset === 0;
                              const optimizedSrc = photo.image_url ? getOptimizedDressingRoomImageUrl(photo.image_url, { height: 900 }) : '';

                              return (
                                <m.div
                                  key={photo.id}
                                  className="absolute bottom-0"
                                  initial={{ scale: 0.3, opacity: 0, x: containerWidth + 100 }}
                                  animate={{ scale: transform.scale, opacity: transform.opacity, x: transform.x, filter: `blur(${transform.blur}px)`, zIndex: transform.zIndex }}
                                  exit={{ scale: 0.3, opacity: 0, x: containerWidth + 200 }}
                                  transition={DRESSING_ROOM_SPRING}
                                  onClick={() => { if (!isDragging && !isActive) setActivePhotoIndex(look.id, index); }}
                                  style={{ willChange: 'transform, filter, opacity', cursor: isActive ? 'default' : 'pointer', transformOrigin: 'bottom center' }}
                                >
                                  <div className="relative group">
                                    <img
                                      src={optimizedSrc}
                                      alt={`Look ${String(look.look_number ?? 0).padStart(2, '0')} photo ${index + 1}`}
                                      className="h-full max-h-[400px] w-auto max-w-none object-contain pointer-events-none select-none"
                                      draggable={false}
                                      decoding="async"
                                      loading={isActive ? 'eager' : 'lazy'}
                                      onError={(event) => {
                                        const img = event.currentTarget;
                                        const fallback = normalizeDressingRoomImageUrl(photo.image_url);
                                        if ((img.getAttribute('src') ?? '') === fallback) return;
                                        img.setAttribute('src', fallback);
                                      }}
                                    />
                                    {isActive && (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          onPrepareUpload(photo.id > 0
                                            ? { kind: 'replace-photo', lookId: look.id, photoId: photo.id, previousUrl: photo.image_url }
                                            : { kind: 'add-photo', lookId: look.id });
                                          fileInputRef.current?.click();
                                        }}
                                        className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-auto"
                                      >
                                        <span className="bg-white/90 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow">📷 Ganti Foto</span>
                                      </button>
                                    )}
                                  </div>
                                </m.div>
                              );
                            })}
                          </AnimatePresence>
                        )}
                      </m.div>
                    </LazyMotion>

                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/50 flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Foto {activePhotos.length === 0 ? 0 : activePhotoIndex + 1}/{activePhotos.length}</span>
                        {activePhotos.length > 0 && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">PNG</span>}
                      </div>

                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => { onPrepareUpload({ kind: 'add-photo', lookId: look.id }); fileInputRef.current?.click(); }} className="text-gray-300 hover:text-gray-900 transition-colors" title="Tambah foto">
                          <span className="material-symbols-outlined text-lg">add_a_photo</span>
                        </button>

                        {activePhoto && activePhoto.id > 0 && (
                          <button type="button" onClick={() => onDeletePhoto(activePhoto.id, activePhoto.image_url)} className="text-gray-300 hover:text-red-500 transition-colors" title="Hapus foto aktif">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}

                        <button onClick={() => onGoPhotoPrev(look.id)} disabled={activePhotoIndex === 0} className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <div className="flex gap-1.5 flex-row-reverse">
                          {activePhotos.map((photo, idx) => (
                            <button
                              key={photo.id}
                              onClick={() => setActivePhotoIndex(look.id, idx)}
                              className={`rounded-full transition-all duration-300 ${idx === activePhotoIndex ? 'bg-gray-800 w-4 h-1.5' : 'bg-gray-300 hover:bg-gray-400 w-1.5 h-1.5'}`}
                              aria-label={`Go to photo ${idx + 1}`}
                              type="button"
                            />
                          ))}
                        </div>
                        <button onClick={() => onGoPhotoNext(look.id, activePhotos.length - 1)} disabled={activePhotoIndex >= activePhotos.length - 1} className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="w-[260px] flex-shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Produk ({look.items.length})</p>
                      <button onClick={onToggleProductPicker} className="text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">+ Tambah</button>
                    </div>

                    {showProductPicker && (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari produk..."
                          value={productSearch}
                          onChange={(event) => onSearchProducts(event.target.value)}
                          autoFocus
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                        {productResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                            {productResults.map((variant) => (
                              <button key={variant.id} onClick={() => onLinkProduct(look.id, variant.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center">
                                <span className="truncate">{variant.product_name} — {variant.name}</span>
                                <span className="text-xs text-gray-400 ml-2">{variant.sku}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchingProducts && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 p-3 text-sm text-gray-400 text-center">Mencari...</div>
                        )}
                      </div>
                    )}

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                      {look.items.length === 0 ? (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg py-10 text-center">
                          <span className="material-symbols-outlined text-3xl text-gray-300 block mb-2">shopping_bag</span>
                          <p className="text-xs text-gray-400">Belum ada produk</p>
                          <p className="text-[10px] text-gray-300 mt-1">Klik "+ Tambah" untuk menghubungkan produk</p>
                        </div>
                      ) : (
                        look.items.map((item) => {
                          const variant = item.product_variant;
                          if (!variant) return null;
                          return (
                            <div key={item.id} className="bg-white rounded-lg border border-gray-100 overflow-hidden group relative">
                              <div className="aspect-square bg-gray-50 overflow-hidden p-3">
                                {item.resolved_image_url || variant.product?.image_url ? (
                                  <img src={(item.resolved_image_url || variant.product?.image_url)!} alt={variant.name} className="w-full h-full object-contain" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                                    <span className="material-symbols-outlined text-3xl">image</span>
                                  </div>
                                )}
                              </div>
                              <div className="px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-700 truncate">{item.label || variant.name}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-[10px] text-gray-400">{variant.price !== null ? formatPrice(variant.price) : ''}</p>
                                  <button onClick={() => onUnlinkProduct(item.id)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Hapus produk dari look">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
