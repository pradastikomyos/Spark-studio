import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import CategoryManager from '../../components/admin/CategoryManager';
import ProductFormModal, { type CategoryOption } from '../../components/admin/ProductFormModal';
import QRScannerModal from '../../components/admin/QRScannerModal';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';
import { useToast } from '../../components/Toast';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useInventory, type ProductRow } from '../../hooks/useInventory';
import { useSessionRefresh } from '../../hooks/useSessionRefresh';
import { DeleteProductDialog } from './store-inventory/DeleteProductDialog';
import { InventoryEmptyState } from './store-inventory/InventoryEmptyState';
import { InventoryGrid } from './store-inventory/InventoryGrid';
import { InventoryToolbar } from './store-inventory/InventoryToolbar';
import { InventoryVerificationPanel } from './store-inventory/InventoryVerificationPanel';
import { mapInventoryProducts } from './store-inventory/inventoryProducts';
import { useInventoryImageMetrics } from './store-inventory/useInventoryImageMetrics';
import { useInventoryProductActions } from './store-inventory/useInventoryProductActions';
import { useStoreInventoryFilters } from './store-inventory/useStoreInventoryFilters';

const TAB_RETURN_EVENT = 'tab-returned-from-idle';
const INVENTORY_PRODUCTS_PER_PAGE = 24;

const StoreInventory = () => {
  const { signOut, session } = useAuth();
  const { showToast } = useToast();
  useSessionRefresh();
  const location = useLocation();
  const navigate = useNavigate();

  const [orderCode, setOrderCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [productsRaw, setProductsRaw] = useState<ProductRow[]>([]);
  const [totalProducts, setTotalProducts] = useState<number | null>(null);

  const filters = useStoreInventoryFilters({
    pathname: location.pathname,
    search: location.search,
    navigate,
    totalProducts,
    isFetching: false,
    pageSize: INVENTORY_PRODUCTS_PER_PAGE,
  });

  const { data, error, isLoading, isFetching, refetch } = useInventory({
    page: filters.currentPage,
    pageSize: INVENTORY_PRODUCTS_PER_PAGE,
    searchQuery: filters.searchQuery,
    categoryFilter: filters.categoryFilter,
    stockFilter: filters.stockFilter,
  });

  useEffect(() => {
    if (data) {
      setProductsRaw(data.products);
    }
  }, [data]);

  useEffect(() => {
    if (typeof data?.totalCount === 'number') {
      setTotalProducts(data.totalCount);
    }
  }, [data?.totalCount]);

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load inventory');
    }
  }, [error, showToast]);

  useEffect(() => {
    if (!data) return;
    console.debug('[InventoryPerf]', {
      metric: 'inventory_list_fetch',
      fetchMs: Math.round(data.diagnostics.fetchMs),
      fullScan: data.diagnostics.fullScan,
      page: filters.currentPage,
      pageSize: INVENTORY_PRODUCTS_PER_PAGE,
      totalCount: data.totalCount,
      filters: {
        search: filters.searchQuery,
        category: filters.categoryFilter,
        stock: filters.stockFilter,
      },
    });
  }, [data, filters.currentPage, filters.searchQuery, filters.categoryFilter, filters.stockFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTabReturn = async () => {
      await refetch();
    };
    window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
    return () => {
      window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
    };
  }, [refetch]);

  const inventoryCategories = useMemo(() => data?.categories ?? [], [data?.categories]);
  const categoryOptions = useMemo(
    (): CategoryOption[] =>
      inventoryCategories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        is_active: category.is_active ?? undefined,
        parent_id: category.parent_id ?? null,
      })),
    [inventoryCategories]
  );
  const inventoryProducts = useMemo(() => mapInventoryProducts(productsRaw), [productsRaw]);
  const resolvedTotalProducts = totalProducts ?? 0;
  const totalPages = Math.max(1, Math.ceil(resolvedTotalProducts / INVENTORY_PRODUCTS_PER_PAGE));
  const { thumbFallbackIds, trackImageResult, markThumbFallback } = useInventoryImageMetrics(inventoryProducts, filters.currentPage);
  const productActions = useInventoryProductActions({
    productsRaw,
    setProductsRaw,
    session,
    refetch,
    showToast,
  });

  const handleVerify = (code?: string) => {
    const value = (code ?? orderCode).trim();
    if (value) {
      alert(`Verifying order: ${value}`);
      setOrderCode('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="store-inventory"
      title="Store & Inventory"
      subtitle="Manage products, stock levels, and pickup verification."
      headerActions={
        <>
          <button
            onClick={() => setShowCategoryManager(true)}
            aria-label="Categories"
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-neutral-900 shadow-sm transition-colors hover:bg-gray-50 sm:px-4"
          >
            <span className="material-symbols-outlined text-[20px]">category</span>
            <span className="hidden sm:inline">Categories</span>
          </button>
          <button
            aria-label="Stock Report"
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-neutral-900 shadow-sm transition-colors hover:bg-gray-50 sm:px-4"
          >
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            <span className="hidden sm:inline">Stock Report</span>
          </button>
          <button
            onClick={productActions.handleOpenCreate}
            aria-label="Add Product"
            className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#ff4b86] px-3 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#ff6a9a] sm:px-4"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </>
      }
      onLogout={signOut}
      mainClassName="relative"
    >
      <InventoryVerificationPanel
        orderCode={orderCode}
        onOrderCodeChange={setOrderCode}
        onOpenScanner={() => setShowScanner(true)}
        onVerify={() => handleVerify()}
        onKeyDown={handleKeyDown}
      />

      <section className="flex flex-col gap-6">
        <InventoryToolbar
          resolvedTotalProducts={resolvedTotalProducts}
          isFetching={isFetching}
          searchInput={filters.searchInput}
          categoryFilter={filters.categoryFilter}
          stockFilter={filters.stockFilter}
          categoryOptions={categoryOptions}
          onSearchInputChange={(value) => {
            filters.setSearchInput(value);
            filters.setCurrentPage(1);
          }}
          onCategoryFilterChange={(value) => {
            filters.setCategoryFilter(value);
            filters.setCurrentPage(1);
          }}
          onStockFilterChange={(value) => {
            filters.setStockFilter(value);
            filters.setCurrentPage(1);
          }}
        />

        {isLoading ? (
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full">
              <tbody>
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
              </tbody>
            </table>
          </div>
        ) : resolvedTotalProducts === 0 ? (
          <InventoryEmptyState onAddProduct={productActions.handleOpenCreate} />
        ) : (
          <>
            <InventoryGrid
              products={inventoryProducts}
              thumbFallbackIds={thumbFallbackIds}
              onEdit={productActions.handleOpenEdit}
              onDelete={productActions.setDeletingProduct}
              onTrackImageResult={trackImageResult}
              onThumbFallback={markThumbFallback}
            />

            {resolvedTotalProducts > 0 && totalPages > 1 && (
              <div className="mt-10 flex flex-col items-center gap-4">
                <p className="text-sm text-gray-500 font-sans">
                  Page {filters.currentPage} of {totalPages} ({resolvedTotalProducts} items)
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => filters.setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={filters.currentPage <= 1}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => filters.setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={filters.currentPage >= totalPages}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {productActions.saveError && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{productActions.saveError}</div>
      )}

      <ProductFormModal
        isOpen={productActions.showProductForm}
        categories={categoryOptions}
        initialValue={productActions.editingProduct}
        existingImages={productActions.existingImages}
        existingImagesLoading={productActions.existingImagesLoading}
        onClose={productActions.closeProductForm}
        onSave={productActions.handleSaveProduct}
      />

      <DeleteProductDialog
        deletingProduct={productActions.deletingProduct}
        saving={productActions.saving}
        onClose={() => {
          if (!productActions.saving) {
            productActions.setDeletingProduct(null);
          }
        }}
        onDelete={productActions.handleDelete}
      />

      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onUpdate={() => {
          void refetch();
        }}
      />

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        title="Scan Pickup Code"
        onScan={(decodedText) => {
          const normalized = decodedText.toUpperCase();
          setOrderCode(normalized);
          handleVerify(normalized);
          setShowScanner(false);
        }}
      />
    </AdminLayout>
  );
};

export default StoreInventory;
