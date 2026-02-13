# Voucher System

Dokumen ini menjelaskan cara kerja voucher diskon untuk checkout produk (Shop) di Spark Stage.

## Data Model (public schema)

- `vouchers`
  - `code` (uppercase), `is_active`, `valid_from`, `valid_until`
  - `quota`, `used_count`
  - `discount_type` (`fixed` / `percentage`), `discount_value`, `max_discount`, `min_purchase`
  - `applicable_categories` (`int[]`) untuk membatasi kategori
- `voucher_usage`
  - log penggunaan voucher per user/order (audit)

## Kategori: Parent ↔ Child

Voucher yang di-set untuk parent category harus berlaku juga untuk sub-category.
Implementasi validasi kategori memakai recursive CTE untuk menambahkan ancestor category dari kategori produk (contoh: `Aksesoris -> Bangle`).

## RPC yang Dipakai

- `validate_voucher(p_code, p_subtotal, p_category_ids)`
  - Dipakai frontend saat user klik tombol “Gunakan”.
  - Read-only: menghitung diskon dan mengembalikan error yang lebih UX-friendly.
  - Tidak mengubah `used_count`.
- `validate_and_reserve_voucher(p_code, p_user_id, p_subtotal, p_category_ids)`
  - Dipakai server-side (Edge Functions) untuk checkout.
  - Atomic reserve: `SELECT ... FOR UPDATE` lalu increment `used_count` untuk mencegah race condition.
- `release_voucher_quota(p_voucher_id)`
  - Dipakai server-side untuk rollback jika checkout gagal / expired / cancelled.

## Flow Checkout Produk (High Level)

1. Frontend “apply voucher”:
   - Call `validate_voucher(...)`.
   - Jika valid: tampilkan diskon (tanpa reserve quota).
2. Saat create order (Midtrans / cashier):
   - Edge Function call `validate_and_reserve_voucher(...)`.
   - Jika proses berhenti/invalid: Edge Function call `release_voucher_quota(...)` (best-effort).
3. Saat status pembayaran final (webhook/sync/cancel):
   - Jika order failed/expired/cancelled: quota dirilis lagi via `release_voucher_quota(...)`.

## RLS & Admin Source Of Truth

Admin policy untuk `vouchers` dan `voucher_usage` memakai `public.is_admin()`.
Role admin ditentukan lewat tabel `public.user_role_assignments` (bukan `raw_user_meta_data`).

