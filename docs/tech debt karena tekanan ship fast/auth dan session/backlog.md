# Audit Auth dan Session

Status: completed

Tanggal audit terakhir: 2026-04-04

## Konteks

Sektor auth dan session yang sebelumnya berbau ship fast sudah dirapikan pada sesi ini. Fokus perubahan ada di empat titik: menghilangkan forced logout saat init session lambat, menetapkan `AuthContext` sebagai owner resmi token recovery, menyatukan contract akses token dan session snapshot, serta merapikan consumer page dan fetcher agar tidak lagi membawa policy auth sendiri.

Verifikasi akhir sesi ini:

- `npm run test -- frontend/src/contexts/AuthContext.test.tsx frontend/src/utils/sessionValidation.test.ts frontend/src/lib/fetchers.test.ts frontend/src/hooks/useSessionRefresh.test.ts frontend/src/hooks/useIdleTabSessionRefresh.test.ts frontend/src/pages/booking-success/bookingSuccessSync.test.ts frontend/src/pages/product-orders/syncProductOrderStatus.test.ts frontend/src/pages/BookingSuccessPage.test.tsx frontend/src/pages/ProductCheckoutPage.test.tsx frontend/src/pages/MyProductOrdersPage.test.tsx frontend/src/pages/ProductOrderSuccessPage.test.tsx frontend/src/pages/ProductOrderPendingPage.test.tsx` pass
- `npm run build` pass
- `deno check --config supabase/functions/deno.json` untuk seluruh `supabase/functions/**/*.ts` pass

## Temuan Utama

1. Selesai: init auth tidak lagi mengubah timeout `getSession()` menjadi forced logout, tetapi masuk ke recovery mode yang tetap mempertahankan local session bila tersedia.
2. Selesai: ownership refresh dan token recovery sudah dipusatkan ke `AuthContext` dan shared auth helpers, bukan lagi tersebar di page flow.
3. Selesai: contract akses token dan session snapshot sekarang hidup di shared layer sehingga booking success, product checkout, product order pages, dan fetcher memakai jalur yang sama.
4. Selesai: `AuthContext` tidak lagi memicu re-init auth karena callback policy yang berubah setiap admin/session state berubah; policy owner kini distabilkan dengan ref yang sinkron.
5. Selesai: test auth/session sudah menutup slow init, network recovery, same-user token refresh, user switch revalidation, dan fetcher/session retry boundary.

## Task Backlog

### Prioritas Tinggi

- [x] Pecah `AuthContext` menjadi orchestration tipis plus service atau helper terpisah.
- [x] Hapus forced logout berbasis timeout pada init auth.
- [x] Tetapkan satu owner resmi untuk refresh dan token recovery.

### Prioritas Menengah

- [x] Satukan contract validasi session.
- [x] Rapikan auth-aware fetch boundary agar tidak baca session sendiri.
- [x] Tambah test untuk slow init, network refresh, user switch, dan 401 retry.

### Prioritas Rendah

- [x] Audit ulang helper auth yang masih membaca sesi secara lokal setelah contract baru masuk.

## Boundary Dengan Sektor Lain

- Booking success, product order success, product order pending, dan checkout page hanya disentuh dari sisi ownership auth dan akses token.
- Business payment logic, voucher semantics, dan order finality tetap menjadi backlog sektor `payment dan checkout`.
- Inventory admin tidak dibahas di file ini kecuali sebagai consumer biasa dari contract auth.

## File Kunci

- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/contexts/AuthContext.test.tsx`
- `frontend/src/auth/sessionAccess.ts`
- `frontend/src/auth/sessionErrors.ts`
- `frontend/src/auth/adminRole.ts`
- `frontend/src/utils/sessionValidation.ts`
- `frontend/src/lib/fetchers.ts`
- `frontend/src/lib/fetchers.test.ts`
- `frontend/src/pages/booking-success/bookingSuccessSync.ts`
- `frontend/src/pages/booking-success/bookingSuccessSync.test.ts`
- `frontend/src/pages/product-orders/syncProductOrderStatus.ts`
- `frontend/src/pages/product-checkout/useProductCheckoutController.ts`
- `frontend/src/pages/ProductCheckoutPage.tsx`
- `frontend/src/pages/BookingSuccessPage.tsx`
- `frontend/src/pages/MyProductOrdersPage.tsx`
- `frontend/src/pages/product-order-success/useProductOrderSuccessController.ts`
- `frontend/src/pages/product-order-pending/useProductOrderPendingController.ts`

## Kriteria Selesai

- [x] Auth init tidak lagi mengubah timeout recovery menjadi forced logout.
- [x] Refresh dan token recovery punya satu owner yang jelas.
- [x] Contract validasi session dipakai konsisten oleh consumer auth-aware.
- [x] Fetcher auth tidak lagi membaca session dengan policy sendiri.
- [x] Test untuk slow init, network refresh, user switch, dan 401 retry lulus.
