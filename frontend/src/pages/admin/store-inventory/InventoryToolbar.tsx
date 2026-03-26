import type { CategoryOption } from '../../../components/admin/ProductFormModal';
import type { StockFilter } from './storeInventoryTypes';

type InventoryToolbarProps = {
  resolvedTotalProducts: number;
  isFetching: boolean;
  searchInput: string;
  categoryFilter: string;
  stockFilter: StockFilter;
  categoryOptions: CategoryOption[];
  onSearchInputChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
};

export function InventoryToolbar(props: InventoryToolbarProps) {
  const {
    resolvedTotalProducts,
    isFetching,
    searchInput,
    categoryFilter,
    stockFilter,
    categoryOptions,
    onSearchInputChange,
    onCategoryFilterChange,
    onStockFilterChange,
  } = props;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold text-neutral-900">Product Inventory</h3>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600 font-sans">{resolvedTotalProducts} Items</span>
        {isFetching && <span className="text-xs font-medium text-gray-500 font-sans">Updating...</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-gray-600">search</span>
          <input
            className="w-full sm:w-64 rounded-lg border border-gray-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans"
            placeholder="Search products..."
            type="text"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans cursor-pointer"
          value={categoryFilter}
          onChange={(event) => onCategoryFilterChange(event.target.value)}
        >
          <option value="">All Categories</option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans cursor-pointer"
          value={stockFilter}
          onChange={(event) => onStockFilterChange(event.target.value as StockFilter)}
        >
          <option value="">Any Stock Status</option>
          <option value="in">In Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>
    </div>
  );
}
