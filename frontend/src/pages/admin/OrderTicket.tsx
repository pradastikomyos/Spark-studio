import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { validateEntranceTicket } from './order-ticket/validateEntranceTicket';

const OrderTicket = () => {
  const { signOut, session } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [validating, setValidating] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{
    type: 'success' | 'error';
    message: string;
    ticketInfo?: {
      code: string;
      userName: string;
      ticketName: string;
      validDate: string;
    };
  } | null>(null);

  const validateTicket = useCallback(
    async (rawCode: string): Promise<void> => {
      const code = rawCode.trim();
      if (!code) throw new Error('Kode QR kosong');
      if (validating) throw new Error('Sedang memproses tiket lain');

      setValidating(true);
      setLastScanResult(null);

      try {
        const ticket = await validateEntranceTicket({
          ticketCode: code,
          session,
        });

        setLastScanResult({
          type: 'success',
          message: 'Tiket berhasil divalidasi! Masuk diizinkan.',
          ticketInfo: {
            code: ticket.code,
            userName: ticket.userName,
            ticketName: ticket.ticketName,
            validDate: ticket.validDate
              ? new Date(`${ticket.validDate}T00:00:00`).toLocaleDateString('id-ID')
              : '-',
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal memvalidasi tiket';
        setLastScanResult({ type: 'error', message });
        console.error('Validation error:', err);
        throw err;
      } finally {
        setValidating(false);
      }
    },
    [session, validating]
  );

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="order-ticket"
      title="Pemindai Tiket Masuk"
      onLogout={signOut}
    >
      {/* Scanner Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">Pemindai Tiket Masuk</h3>
            <p className="text-sm text-gray-600">Pindai kode QR untuk memvalidasi tiket masuk</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200">
            Siap Memindai
          </span>
        </div>

        {/* Scan Result Banner */}
        {lastScanResult && (
          <div
            className={`rounded-lg border px-4 md:px-6 py-4 mb-6 ${lastScanResult.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
              }`}
          >
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl flex-shrink-0">
                {lastScanResult.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base mb-1">{lastScanResult.message}</p>
                {lastScanResult.ticketInfo && (
                  <div className="text-sm space-y-1 mt-3">
                    <p><span className="font-semibold">Tiket:</span> {lastScanResult.ticketInfo.ticketName}</p>
                    <p><span className="font-semibold">Tamu:</span> {lastScanResult.ticketInfo.userName}</p>
                    <p><span className="font-semibold">Kode:</span> {lastScanResult.ticketInfo.code}</p>
                    <p><span className="font-semibold">Tanggal Valid:</span> {lastScanResult.ticketInfo.validDate}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scanner Button */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 p-8 md:p-12 flex flex-col items-center justify-center text-center hover:border-main-500 transition-colors">
          <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-gray-200">
            <span className="material-symbols-outlined text-4xl text-primary">qr_code_scanner</span>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Pindai Tiket Masuk</h4>
          <p className="text-sm text-gray-600 max-w-md mb-6">
            Klik tombol di bawah untuk mengaktifkan kamera dan pindai kode QR pada tiket masuk.
          </p>
          <button
            onClick={() => setShowScanner(true)}
            disabled={validating}
            className="flex items-center gap-2 px-6 py-3 bg-[#ff4b86] text-white text-sm font-bold rounded-lg shadow-md hover:bg-[#ff6a9a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            {validating ? 'Memvalidasi...' : 'Aktifkan Pemindai'}
          </button>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex gap-4 items-start mb-4">
          <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0">info</span>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Cara Menggunakan</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Klik "Aktifkan Pemindai" untuk membuka kamera</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Arahkan kamera ke kode QR pada tiket</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Tunggu validasi otomatis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Pesan hijau = Masuk diizinkan, Pesan merah = Masuk ditolak</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Setelah scan berhasil, scanner akan otomatis menutup</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <QRScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        title="Pindai Tiket Masuk"
        closeOnSuccess={true}
        closeDelayMs={600}
        closeOnError={true}
        closeOnErrorDelayMs={2000}
        autoResumeAfterMs={2500}
        onScan={async (decodedText) => {
          await validateTicket(decodedText);
        }}
      />
    </AdminLayout>
  );
};

export default OrderTicket;
