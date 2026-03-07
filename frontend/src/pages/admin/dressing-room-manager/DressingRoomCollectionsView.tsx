import type { DressingRoomCollection } from './dressingRoomManagerTypes';

type DressingRoomCollectionsViewProps = {
  loading: boolean;
  saving: boolean;
  collections: DressingRoomCollection[];
  showCreateForm: boolean;
  formTitle: string;
  formDescription: string;
  onToggleCreateForm: () => void;
  onChangeFormTitle: (value: string) => void;
  onChangeFormDescription: (value: string) => void;
  onCreateCollection: () => void;
  onToggleActive: (collection: DressingRoomCollection) => void;
  onOpenEditor: (collection: DressingRoomCollection) => void;
  onDeleteCollection: (collectionId: number) => void;
};

export function DressingRoomCollectionsView({
  loading,
  saving,
  collections,
  showCreateForm,
  formTitle,
  formDescription,
  onToggleCreateForm,
  onChangeFormTitle,
  onChangeFormDescription,
  onCreateCollection,
  onToggleActive,
  onOpenEditor,
  onDeleteCollection,
}: DressingRoomCollectionsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Koleksi</h2>
        <button
          onClick={onToggleCreateForm}
          className="px-4 py-2 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          {showCreateForm ? 'Batal' : '+ Koleksi Baru'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-bold mb-2">📋 Alur Kerja Lookbook:</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li><strong>Buat Koleksi</strong> — beri judul dan deskripsi</li>
          <li><strong>Edit Koleksi</strong> — klik Edit untuk masuk visual editor</li>
          <li><strong>Tambah Looks, Upload Foto, Hubungkan Produk</strong></li>
          <li><strong>Aktifkan Koleksi</strong> — toggle agar terlihat di halaman Dressing Room</li>
        </ol>
      </div>

      {showCreateForm && (
        <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-200">
          <input
            type="text"
            placeholder="Judul koleksi (e.g. Spring Summer 2026)"
            value={formTitle}
            onChange={(event) => onChangeFormTitle(event.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
          <textarea
            placeholder="Deskripsi (opsional)"
            value={formDescription}
            onChange={(event) => onChangeFormDescription(event.target.value)}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
          <button
            onClick={onCreateCollection}
            disabled={saving || !formTitle.trim()}
            className="px-6 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Menyimpan...' : 'Buat Koleksi'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : collections.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="material-symbols-outlined text-5xl mb-4 block">styler</span>
          <p className="text-sm">Belum ada koleksi. Buat koleksi pertama!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {collections.map((collection) => (
            <div key={collection.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 truncate">{collection.title}</h3>
                <p className="text-xs text-gray-400">{collection.slug}</p>
              </div>
              <button
                onClick={() => onToggleActive(collection)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  collection.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {collection.is_active ? 'Aktif' : 'Nonaktif'}
              </button>
              <button onClick={() => onOpenEditor(collection)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors" title="Edit looks">
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button onClick={() => onDeleteCollection(collection.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Hapus">
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
