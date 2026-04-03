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
import { useInventory } from '../../hooks/useInventory';
import { DeleteProductDialog } from './store-inventory/DeleteProductDialog';
import { InventoryEmptyState } from './store-inventory/InventoryEmptyState';
import { InventoryGrid } from './store-inventory/InventoryGrid';
import { InventoryToolbar } from './store-inventory/InventoryToolbar';
import { InventoryVerificationPanel } from './store-inventory/InventoryVerificationPanel';
import { mapInventoryProducts } from './store-inventory/inventoryProducts';
import { useInventoryImageMetrics } from './store-inventory/useInventoryImageMetrics';
import { useInventoryProductActions } from './store-inventory/useInventoryProductActions';
import { useStoreInventoryFilters } from './store-inventory/useStoreInventoryFilters';
const INVENTORY_PRODUCTS_PER_PAGE = 24;

const normalizePickupCode = (value: string) => value.trim().toUpperCase();

const StoreInventory = () => {
  const { signOut, session } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [orderCode, setOrderCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const filters = useStoreInventoryFilters({
    pathname: location.pathname,
    search: location.search,
    navigate,
  });

  const { data, error, isLoading, isFetching, refetch } = useInventory({
    page: filters.currentPage,
    pageSize: INVENTORY_PRODUCTS_PER_PAGE,
    searchQuery: filters.searchQuery,
    categoryFilter: filters.categoryFilter,
    stockFilter: filters.stockFilter,
  });
  const resolvedTotalProducts = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(resolvedTotalProducts / INVENTORY_PRODUCTS_PER_PAGE));
  const { currentPage, setCurrentPage } = filters;

  useEffect(() => {
    if (resolvedTotalProducts === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, resolvedTotalProducts, setCurrentPage, totalPages]);

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load inventory');
    }
  }, [error, showToast]);

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
  const inventoryProducts = useMemo(() => mapInventoryProducts(data?.products ?? []), [data?.products]);
  const { thumbFallbackIds, trackImageResult, markThumbFallback } = useInventoryImageMetrics(inventoryProducts, currentPage);
  const productActions = useInventoryProductActions({
    products: data?.products ?? [],
    session,
    refetch,
    showToast,
  });

  const handleVerify = (code?: string) => {
    const value = normalizePickupCode(code ?? orderCode);
    if (!value) {
      showToast('error', 'Masukkan pickup code terlebih dahulu.');
      return;
    }

    setOrderCode('');
    showToast('info', `Membuka verifikasi pickup untuk ${value}.`);
    navigate({
      pathname: '/admin/product-orders',
      search: `?pickupCode=${encodeURIComponent(value)}`,
    });
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
      headerSearchValue={filters.searchInput}
      headerSearchPlaceholder="Search products..."
      onHeaderSearchChange={filters.setSearchInput}
      onHeaderSearchSubmit={filters.commitSearchInput}
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
        {data?.diagnostics.warning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {data.diagnostics.warning}
          </div>
        ) : null}

        <InventoryToolbar
          resolvedTotalProducts={resolvedTotalProducts}
          isFetching={isFetching}
          categoryFilter={filters.categoryFilter}
          stockFilter={filters.stockFilter}
          categoryOptions={categoryOptions}
          onCategoryFilterChange={filters.setCategoryFilter}
          onStockFilterChange={filters.setStockFilter}
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
                  Page {currentPage} of {totalPages} ({resolvedTotalProducts} items)
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#ff4b86] hover:text-[#ff4b86] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
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
          const normalized = normalizePickupCode(decodedText);
          setOrderCode(normalized);
          handleVerify(normalized);
          setShowScanner(false);
        }}
      />
    </AdminLayout>
  );
};

export default StoreInventory;
