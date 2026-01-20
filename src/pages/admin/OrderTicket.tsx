import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';

const OrderTicket = () => {
  const { signOut } = useAuth();
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
        const { data, error } = await supabase
          .from('purchased_tickets')
          .select(`
            id, 
            ticket_code, 
            status, 
            valid_date, 
            used_at,
            users!inner(name, email),
            tickets!inner(name)
          `)
          .eq('ticket_code', code)
          .maybeSingle();

        if (error) {
          const errMsg = 'Gagal mengambil data tiket: ' + error.message;
          setLastScanResult({ type: 'error', message: errMsg });
          throw new Error(errMsg);
        }
        
        if (!data) {
          const errMsg = 'Kode tiket tidak ditemukan di sistem.';
          setLastScanResult({ type: 'error', message: errMsg });
          throw new Error(errMsg);
        }

        if (data.status !== 'active') {
          const errMsg = data.status === 'used' 
            ? `Tiket sudah digunakan pada ${new Date(data.used_at || '').toLocaleString('id-ID')}`
            : `Status tiket: ${data.status}.`;
          setLastScanResult({ type: 'error', message: errMsg });
          throw new Error(errMsg);
        }

        const today = new Date();
        const todayIso = new Date(today.getFullYear(), today.getMonth(), today.getDate())
          .toISOString()
          .slice(0, 10);

        if (data.valid_date < todayIso) {
          const errMsg = `Tiket kadaluarsa. Tanggal valid adalah ${new Date(data.valid_date).toLocaleDateString('id-ID')}.`;
          setLastScanResult({ type: 'error', message: errMsg });
          throw new Error(errMsg);
        }

        if (data.valid_date > todayIso) {
          const errMsg = `Tiket belum valid. Berlaku mulai ${new Date(data.valid_date).toLocaleDateString('id-ID')}.`;
          setLastScanResult({ type: 'error', message: errMsg });
          throw new Error(errMsg);
        }

        // Update ticket status to 'used' - only update status, not other columns that might not exist
        console.log('Attempting to update ticket ID:', data.id);
        const { data: updatedTicket, error: updateError } = await supabase
          .from('purchased_tickets')
          .update({ status: 'used' })
          .eq('id', data.id)
          .eq('status', 'active')
          .select('id, status')
          .maybeSingle();

        console.log('Update result:', { updatedTicket, updateError });

        if (updateError) {
          console.error('Update error:', updateError);
          const errMsg = `Gagal update tiket: ${updateError.message}`;
          setLastScanResult({ type: 'error', message: errMsg });
          throw new Error(errMsg);
        }

        // Verify the update actually happened
        if (!updatedTicket) {
          const errMsg = 'Gagal memperbarui status tiket. Kemungkinan ada masalah permission database.';
          console.error('No updated ticket returned - possible RLS issue');
          setLastScanResult({ type: 'error', message: errMsg });
          throw new Error(errMsg);
        }

        // Double-check the status was updated correctly
        if (updatedTicket.status !== 'used') {
          const errMsg = 'Status tiket tidak berhasil diperbarui. Silakan coba lagi.';
          setLastScanResult({ type: 'error', message: errMsg });
          throw new Error(errMsg);
        }

        // SUCCESS - only reach here if everything worked
        setLastScanResult({ 
          type: 'success', 
          message: 'Tiket berhasil divalidasi! Masuk diizinkan.',
          ticketInfo: {
            code: data.ticket_code,
            userName: (data.users as any).name,
            ticketName: (data.tickets as any).name,
            validDate: new Date(data.valid_date).toLocaleDateString('id-ID'),
          }
        });
        // Don't throw - success!
      } catch (err) {
        console.error('Validation error:', err);
        // Re-throw to let QRScannerModal know this failed
        throw err;
      } finally {
        setValidating(false);
      }
    },
    [validating]
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
      <div className="rounded-xl border border-white/5 bg-surface-dark p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white font-display mb-2">Pemindai Tiket Masuk</h3>
            <p className="text-sm text-gray-400">Pindai kode QR untuk memvalidasi tiket masuk</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
            Siap Memindai
          </span>
        </div>

        {/* Scan Result Banner */}
        {lastScanResult && (
          <div
            className={`rounded-lg border px-4 md:px-6 py-4 mb-6 ${
              lastScanResult.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-200'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200'
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
        <div className="border-2 border-dashed border-white/10 rounded-xl bg-surface-darker p-8 md:p-12 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
          <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-4xl text-primary">qr_code_scanner</span>
          </div>
          <h4 className="text-lg font-medium text-white mb-2">Pindai Tiket Masuk</h4>
          <p className="text-sm text-gray-400 max-w-md mb-6">
            Klik tombol di bawah untuk mengaktifkan kamera dan pindai kode QR pada tiket masuk.
          </p>
          <button
            onClick={() => setShowScanner(true)}
            disabled={validating}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-bold rounded-lg shadow-lg shadow-red-900/20 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">qr_code_scanner</span>
            {validating ? 'Memvalidasi...' : 'Aktifkan Pemindai'}
          </button>
        </div>
      </div>

      {/* Instructions Card */}
      <div className="rounded-xl border border-white/5 bg-surface-dark p-6">
        <div className="flex gap-4 items-start mb-4">
          <span className="material-symbols-outlined text-primary text-2xl flex-shrink-0">info</span>
          <div>
            <h4 className="font-bold text-white mb-2">Cara Menggunakan</h4>
            <ul className="text-sm text-gray-400 space-y-2">
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
        closeDelayMs={1500}
        autoResumeAfterMs={2500}
        onScan={async (decodedText) => {
          await validateTicket(decodedText);
        }}
      />
    </AdminLayout>
  );
};

export default OrderTicket;
