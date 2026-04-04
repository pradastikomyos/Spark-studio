# Audit Payment dan Checkout

Status: open

Tanggal audit terakhir: 4 April 2026

## Konteks

Sektor ini menampung tech debt yang muncul dari tekanan ship fast di flow pembayaran dan checkout product. Fokusnya adalah menjaga konsistensi antara online payment, cashier checkout, voucher, release path, dan retry/auth policy yang masih menempel di controller checkout.

Arsip sesi sebelumnya: [session-report-2026-04-03.md](session-report-2026-04-03.md)

Yang sengaja di luar sektor ini:

- Coupling `PRINT-*` operasional lintas project
- Remedi auth ownership yang murni milik sektor `auth dan session`
- Refactor inventory admin yang murni milik sektor `admin inventory`

## Temuan Utama

- High: cashier order menulis `voucher_usage` sebelum payment finality.
- Medium: online vs cashier order creation masih hampir copy-paste penuh.
- Medium: rollback/release policy antar flow sudah drift.
- Medium: cancel vs expire product order memakai release path yang tidak konsisten.
- Medium: checkout controller masih punya local auth/token retry policy.

## Task Backlog

### Prioritas Tinggi

- [ ] Pindahkan pencatatan `voucher_usage` cashier ke titik finality payment/pickup, bukan saat order unpaid dibuat.
- [ ] Tambah cleanup data untuk `voucher_usage` yang stale dari order cashier unpaid, cancelled, atau expired.
- [ ] Ekstrak shared product-order creation pipeline untuk online dan cashier.
- [ ] Samakan rollback/release path voucher dan stock ke helper atau RPC bersama.

### Prioritas Menengah

- [ ] Samakan cancel/expire path agar tidak ada drifting direct stock mutation di luar RPC resmi.
- [ ] Sederhanakan `useProductCheckoutController` agar auth/token policy tidak dikelola lokal.
- [ ] Audit ulang helper checkout yang masih memanggil `supabase.auth.getSession()` atau `refreshSession()` sendiri.

### Prioritas Rendah

- [ ] Dokumentasikan kapan `voucher_usage` dianggap final usage dan kapan masih dianggap reservation semu.
- [ ] Rapikan catatan boundary antara cashier checkout, online checkout, dan voucher reporting.

## Boundary Dengan Sektor Lain

- Masalah auth/session yang murni ownership recovery tetap masuk sektor `auth dan session`.
- Inventory stock mutation yang lebih luas tetap masuk sektor `admin inventory`.
- PRINT coupling dan routing lintas project tetap out of scope untuk backlog ini.

## File Kunci

- `supabase/functions/create-midtrans-product-token/index.ts`
- `supabase/functions/create-cashier-product-order/index.ts`
- `supabase/functions/_shared/payment-processors.ts`
- `supabase/functions/_shared/payment-effects.ts`
- `supabase/functions/cancel-product-order/index.ts`
- `supabase/functions/expire-product-orders/index.ts`
- `frontend/src/pages/product-checkout/useProductCheckoutController.ts`

## Kriteria Selesai

- Flow order online dan cashier tidak lagi copy-paste di titik business rule inti.
- `voucher_usage` tidak lagi tercatat sebagai usage final sebelum finality payment/pickup.
- Cancel dan expire mengikuti release path yang konsisten.
- Checkout controller tidak lagi membawa policy auth/token retry lokal yang bertabrakan dengan owner auth.
- Task payment/checkout dapat dites tanpa harus mengubah policy di sektor lain.
