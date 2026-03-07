type InventoryEmptyStateProps = {
  onAddProduct: () => void;
};

export function InventoryEmptyState({ onAddProduct }: InventoryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
      <span className="material-symbols-outlined text-6xl text-gray-700 mb-4">inventory_2</span>
      <h3 className="text-lg font-bold text-neutral-900 mb-2">No Products Found</h3>
      <p className="text-sm text-gray-500 text-center max-w-md mb-6">
        Try adjusting your search or filters, or add your first product to start tracking stock and pricing.
      </p>
      <button onClick={onAddProduct} className="flex items-center gap-2 rounded-lg bg-[#ff4b86] px-6 py-3 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-colors shadow-md">
        <span className="material-symbols-outlined text-[20px]">add</span>
        <span>Add Your First Product</span>
      </button>
    </div>
  );
}
