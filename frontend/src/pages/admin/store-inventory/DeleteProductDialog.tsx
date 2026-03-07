import type { DeletingProduct } from './storeInventoryTypes';

type DeleteProductDialogProps = {
  deletingProduct: DeletingProduct | null;
  saving: boolean;
  onClose: () => void;
  onDelete: () => void;
};

export function DeleteProductDialog(props: DeleteProductDialogProps) {
  const { deletingProduct, saving, onClose, onDelete } = props;

  if (!deletingProduct) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl animate-fade-in-scale">
        <h3 className="text-lg font-bold text-gray-900">Delete product?</h3>
        <p className="mt-2 text-sm text-gray-600">
          This will soft-delete <span className="font-bold text-gray-900">{deletingProduct.name}</span>.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button disabled={saving} onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50">
            Cancel
          </button>
          <button disabled={saving} onClick={onDelete} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-gray-900 hover:bg-primary-dark disabled:opacity-50">
            {saving ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
