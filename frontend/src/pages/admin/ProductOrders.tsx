import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useProductOrders } from '../../hooks/useProductOrders';
import { useToast } from '../../components/Toast';
import { ProductOrderDetailsModal } from './product-orders/ProductOrderDetailsModal';
import { ProductOrdersListSection } from './product-orders/ProductOrdersListSection';
import { ProductOrdersLookupPanel } from './product-orders/ProductOrdersLookupPanel';
import { useProductOrdersController } from './product-orders/useProductOrdersController';

export default function ProductOrders() {
  const { signOut, session } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const { data, error, isLoading, isFetching, refetch } = useProductOrders();
  const orders = data?.orders ?? [];
  const pendingCount = data?.pendingCount ?? 0;
  const ordersError = error instanceof Error ? error.message : error ? 'Gagal memuat daftar pesanan' : null;
  const controller = useProductOrdersController({
    orders,
    pendingCount,
    ordersError,
    session,
    showToast,
  });
  const {
    activeTab,
    scannerOpen,
    lookupCode,
    lookupError,
    details,
    submitting,
    actionError,
    inputRef,
    pendingOrders,
    todaysOrders,
    completedOrders,
    displayOrders,
    menuSections,
    setActiveTab,
    setScannerOpen,
    setLookupCode,
    handleLookup,
    handleScan,
    handleSelectOrder,
    handleCloseDetails,
    handleCompletePickup,
  } = controller;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pickupCode = params.get('pickupCode')?.trim().toUpperCase();
    if (!pickupCode) return;

    setLookupCode(pickupCode);
    void handleSelectOrder(pickupCode);

    params.delete('pickupCode');
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true }
    );
  }, [handleSelectOrder, location.pathname, location.search, navigate, setLookupCode]);

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections.length > 0 ? menuSections : ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="product-orders"
      title="Pesanan Produk"
      subtitle="Scan pickup code untuk verifikasi barang."
      headerActions={
        <button
          onClick={() => setScannerOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#ff4b86] px-3 md:px-4 py-2.5 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-colors shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          <span className="hidden sm:inline">Scan QR</span>
        </button>
      }
      onLogout={signOut}
    >
      <ProductOrdersLookupPanel
        inputRef={inputRef}
        lookupCode={lookupCode}
        lookupError={lookupError}
        onChangeCode={setLookupCode}
        onLookup={() => {
          void handleLookup();
        }}
      />

      <ProductOrdersListSection
        activeTab={activeTab}
        pendingCount={pendingOrders.length}
        todayCount={todaysOrders.length}
        completedCount={completedOrders.length}
        isLoading={isLoading}
        isFetching={isFetching}
        ordersError={ordersError}
        displayOrders={displayOrders}
        onChangeTab={setActiveTab}
        onRefresh={() => {
          void refetch();
        }}
        onSelectOrder={(pickupCode) => {
          void handleSelectOrder(pickupCode);
        }}
      />

      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        title="Scan Pickup QR"
        onScan={handleScan}
        closeOnSuccess={true}
        closeDelayMs={1000}
        closeOnError={true}
        closeOnErrorDelayMs={1000}
        autoResumeOnError={false}
      />

      <ProductOrderDetailsModal
        details={details}
        submitting={submitting}
        actionError={actionError}
        onClose={handleCloseDetails}
        onCompletePickup={() => {
          void handleCompletePickup();
        }}
      />
    </AdminLayout>
  );
}
