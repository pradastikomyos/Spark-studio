# Audit Status Repo

Label: tech debt karena tekanan ship fast dan banyak fitur

Catatan konteks:

Sesi ini adalah pembayaran hutang teknis dari keputusan ship fast saat deadline mepet. Ownership atas pressure dan keputusan tradeoff saat itu ada di sisi delivery saya, jadi pekerjaan batch ini memang diposisikan sebagai cleanup dan stabilisasi atas keputusan tersebut, bukan bugfix acak tanpa konteks.

Arah sesi berikutnya:

Kemungkinan fokus berikutnya adalah mengaudit sektor-sektor yang masih berbau ship fast dan redundant, termasuk logic yang dobel, hook dengan tanggung jawab bercampur, boundary responsibility yang berantakan, spaghetti code, dan bentuk coupling lain yang belum cukup sehat.

Tanggal audit: 3 April 2026 (WIB)

## Ringkasan

Batch ini menutup lima task substantif yang sebelumnya masih terbuka:

1. Inventory mutation dipindahkan ke RPC database yang atomic untuk save/delete.
2. Cashier pickup dipisahkan dari auto-repair payment side effects.
3. Route shell dipecah dari satu file besar menjadi modul route per domain.
4. Entrance booking config save dipindahkan ke RPC atomic.
5. Payment idempotency dinaikkan ke marker database-first melalui `payment_effect_runs`.

Status hasil akhir:

- `npm run build` pass.
- `deno check` untuk seluruh `supabase/functions/**/*.ts` pass.
- Test yang relevan untuk route shell, entrance booking, session refresh, dan inventory pass.

Klaim lama bahwa Deno belum bisa diverifikasi atau tidak tersedia di environment ini sudah tidak berlaku.

## Verifikasi Teknis

Perintah yang diverifikasi:

- `npm run build`
- `deno check --config supabase/functions/deno.json` untuk seluruh file TypeScript di `supabase/functions/`
- `npm run test -- frontend/src/hooks/useSessionRefresh.test.ts frontend/src/hooks/useIdleTabSessionRefresh.test.ts frontend/src/pages/admin/store-inventory/useStoreInventoryFilters.test.ts frontend/src/pages/admin/store-inventory/useInventoryProductActions.test.ts frontend/src/pages/admin/StoreInventory.test.tsx frontend/src/app/routes/routeShell.test.ts frontend/src/pages/admin/entrance-booking/entranceBookingHelpers.test.ts frontend/src/pages/admin/entrance-booking/useEntranceBookingConfigForm.test.ts`

Hasil:

- build frontend lulus
- type-check Edge Functions lulus
- subset test yang menyentuh area perubahan lulus

## Status Per Sektor

### 1. Payment lifecycle

Status: selesai untuk target batch ini

Perubahan utama:

- Shared payment effects sekarang memakai marker database-first lewat tabel `payment_effect_runs`.
- Claim, complete, dan fail untuk side effect payment dipindahkan ke RPC database, bukan hanya guard di level helper.
- `issue_tickets`, `release_ticket_capacity`, `ensure_voucher_usage`, `release_voucher_quota`, `ensure_paid_side_effects`, dan `release_reserved_stock` sekarang memakai claim marker yang konsisten.

File kunci:

- `supabase/functions/_shared/payment-effects.ts`
- `supabase/functions/_shared/database.types.ts`
- `supabase/migrations/20260403173000_add_payment_effect_runs.sql`

Catatan:

- Masih ada coupling operasional lintas project untuk routing order `PRINT-*` di webhook, tetapi itu di luar lima task batch ini.

### 2. Auth/session recovery

Status: selesai untuk blocker yang relevan

Perubahan utama:

- Flow booking success dan product order sync sudah dirapikan agar kontrak token konsisten `string | null`.
- Nullability session yang sebelumnya memblokir build sudah ditutup.

File kunci:

- `frontend/src/pages/booking-success/bookingSuccessSync.ts`
- `frontend/src/pages/booking-success/useBookingSuccessController.ts`
- `frontend/src/pages/product-orders/syncProductOrderStatus.ts`

### 3. Admin inventory

Status: selesai untuk target transactional consistency batch ini

Perubahan utama:

- Save/delete inventory sekarang berjalan lewat RPC database:
  - `save_inventory_product`
  - `delete_inventory_product`
- Variant, image record, dan soft delete produk sekarang diproses atomically di database, bukan lagi rangkaian update table dari client.
- Edge Function inventory sekarang menjadi boundary untuk validasi request dan cleanup ImageKit.

File kunci:

- `supabase/migrations/20260403183100_inventory_product_mutation_rpc.sql`
- `supabase/functions/inventory-product-mutation/index.ts`
- `frontend/src/pages/admin/store-inventory/inventoryProductMutations.ts`

Catatan:

- Upload/delete file ImageKit tetap berada di luar transaksi database karena storage eksternal memang tidak ikut satu transaction boundary. Jalur ini sekarang memakai rollback/cleanup best-effort, sedangkan mutasi database inti sudah atomic.

### 4. QR/pickup verification

Status: selesai untuk target decoupling cashier pickup

Perubahan utama:

- `complete-product-pickup` tidak lagi memanggil `ensureProductPaidSideEffects(...)` untuk order cashier yang belum paid.
- Completion sekarang memilih RPC atomic yang sesuai:
  - `complete_product_pickup_atomic` untuk order yang memang sudah paid
  - `complete_cashier_product_pickup_atomic` untuk order cashier unpaid

File kunci:

- `supabase/functions/complete-product-pickup/index.ts`
- `supabase/migrations/20260403193000_add_cashier_product_pickup_atomic.sql`

### 5. Route shell dan navigation policy

Status: selesai untuk target modularisasi batch ini

Perubahan utama:

- Route map besar dipecah menjadi modul route per domain.
- Redirect policy legacy dipisahkan dari surface route utama.
- `AppRoutes.tsx` sekarang menjadi composer tipis, bukan pusat seluruh detail lazy routes.

File kunci:

- `frontend/src/app/AppRoutes.tsx`
- `frontend/src/app/routes/adminRoutes.ts`
- `frontend/src/app/routes/publicRoutes.ts`
- `frontend/src/app/routes/protectedPublicRoutes.ts`
- `frontend/src/app/routes/standaloneRoutes.ts`
- `frontend/src/app/routes/legacyRoutes.tsx`
- `frontend/src/app/routes/routeShell.tsx`
- `frontend/src/app/routes/routeShell.test.ts`

### 6. Entrance booking admin

Status: selesai untuk target atomic save batch ini

Perubahan utama:

- Save config tidak lagi memakai update `tickets` lalu upsert `ticket_booking_settings` secara terpisah dari client.
- Flow save sekarang memakai RPC tunggal `save_entrance_booking_config`.

File kunci:

- `frontend/src/pages/admin/entrance-booking/useEntranceBookingConfigForm.ts`
- `frontend/src/pages/admin/entrance-booking/useEntranceBookingConfigForm.test.ts`
- `supabase/migrations/20260403183000_atomic_entrance_booking_config.sql`

## Ringkasan Perubahan Kode

Frontend:

- booking success sync dirapikan agar build bersih
- route shell dimodularisasi
- entrance booking config save dibuat atomic dari sisi boundary data

Supabase / Edge Functions:

- shared database types diperluas untuk RPC baru
- payment idempotency dipindahkan ke marker database-first
- cashier pickup completion dipisahkan dari payment side effect repair
- inventory mutation dipindahkan ke RPC atomic

## Kesimpulan

Status repo setelah batch ini:

- lima task yang sebelumnya masih tersisa sudah ditutup untuk scope implementasi yang diminta
- toolchain utama hijau
- laporan lama yang menyebut Deno belum diverifikasi sudah obsolete

Sisa kerja repo sekarang bukan lagi lima task tersebut, melainkan backlog baru di luar scope batch ini jika nanti ingin lanjut ke hardening tambahan atau simplifikasi arsitektur berikutnya.
