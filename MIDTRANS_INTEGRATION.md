# Midtrans × Supabase Workflow

## Komponen

- Frontend (Vite/React)
  - [PaymentPage.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/PaymentPage.tsx) memulai pembayaran via Snap popup
  - [BookingSuccessPage.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/BookingSuccessPage.tsx) menampilkan status order dan tiket
- Supabase Edge Functions
  - [create-midtrans-token](file:///c:/Users/prada/Documents/Spark%20studio/supabase/functions/create-midtrans-token/index.ts) membuat order + request Snap token
  - [midtrans-webhook](file:///c:/Users/prada/Documents/Spark%20studio/supabase/functions/midtrans-webhook/index.ts) menerima HTTP Notification dan update status/tiket
  - [sync-midtrans-status](file:///c:/Users/prada/Documents/Spark%20studio/supabase/functions/sync-midtrans-status/index.ts) fallback manual: cek status ke Core API Midtrans dan sinkronkan ke DB
- Database (public schema)
  - `orders` (status pembayaran + `payment_data`)
  - `order_items` (item yang dibeli)
  - `purchased_tickets` (tiket yang dibuat setelah paid)
  - `ticket_availabilities` (kapasitas)

## Alur End-to-End

1. User klik bayar di PaymentPage → panggil Edge Function `create-midtrans-token`
2. `create-midtrans-token`:
   - buat record `orders` status awal `pending`
   - request Snap token ke Midtrans (`/snap/v1/transactions`)
   - simpan token/redirect_url ke `orders`
3. Frontend membuka Snap popup (`window.snap.pay(token, callbacks)`)
4. Midtrans mengirim HTTP Notification ke `midtrans-webhook`
5. `midtrans-webhook`:
   - verifikasi signature
   - mapping `transaction_status` → `orders.status`
   - jika `paid`: buat `purchased_tickets` (idempotent) + update sold_capacity
6. BookingSuccessPage:
   - fetch `orders` dan `purchased_tickets` (kalau sudah `paid`)
   - realtime subscribe + polling fallback untuk update status
   - tombol “Check Status” memanggil `sync-midtrans-status` bila status stuck

## Signature Verification (Midtrans HTTP Notification)

Midtrans mensyaratkan perhitungan:

`SHA512(order_id + status_code + gross_amount + ServerKey)`

Implementasi di [midtrans-webhook](file:///c:/Users/prada/Documents/Spark%20studio/supabase/functions/midtrans-webhook/index.ts) mengikuti rumus tersebut dan menormalisasi tipe `status_code`/`gross_amount` agar tidak mismatch ketika payload bertipe number vs string.

## Status Mapping (Midtrans → orders.status)

Mapping yang dipakai (dan diuji di frontend util [midtransStatus.ts](file:///c:/Users/prada/Documents/Spark%20studio/src/utils/midtransStatus.ts)):

- `settlement` → `paid`
- `capture` + `fraud_status=accept` (atau fraud_status tidak ada) → `paid`
- `capture` + `fraud_status!=accept` → `pending`
- `pending` → `pending`
- `deny | cancel | failure` → `failed`
- `expire | expired` → `expired`
- `refund | refunded | partial_refund` → `refunded`

## Bug Report: “Status sudah paid tapi UI pending / infinite loading”

### Dugaan penyebab paling sering

- HTTP Notification tidak sampai ke webhook (URL belum diset di Midtrans Dashboard).
- Signature mismatch (format `gross_amount`/`status_code` berbeda).
- Webhook retry terjadi bersamaan (race condition) dan pembuatan tiket tidak idempotent.

### Fix yang diterapkan

- Webhook dibuat lebih robust:
  - signature verify lebih ketat dan stabil terhadap tipe data
  - pembuatan `purchased_tickets` idempotent (mengisi “kekurangan” tiket per order_item)
  - update `ticket_availabilities.sold_capacity` memakai optimistic concurrency (pakai kolom `version`)
  - normalisasi `all-day` menjadi `NULL` untuk `ticket_availabilities.time_slot`
- BookingSuccessPage:
  - tidak lagi bergantung pada flag `isPending` saja; status diambil dari DB
  - realtime subscribe + polling fallback (stop saat expired/final)
  - tombol “Check Status” untuk sinkronisasi manual via `sync-midtrans-status`

## Reproduksi (Sandbox VA / Bank Transfer)

1. Pastikan `VITE_MIDTRANS_IS_PRODUCTION=false` dan `VITE_MIDTRANS_CLIENT_KEY` menggunakan sandbox client key.
2. Jalankan aplikasi, lakukan flow booking → PaymentPage.
3. Pilih metode Bank Transfer (VA) dan selesaikan instruksi pembayaran.
4. Buka BookingSuccessPage:
   - status awal biasanya `pending`
   - setelah pembayaran masuk, status berubah ke `paid` dan tiket muncul
5. Jika status tidak berubah:
   - klik tombol “Check Status”
   - cek `orders.payment_data` untuk memastikan respon Midtrans tersimpan

## Konsistensi Data (Query)

Contoh cek mismatch status:

- `orders.status` vs `payment_data->>'transaction_status'`
- `orders(status=paid)` tapi tiket belum ada (harus 0 hasil)

Semua cek ini dilakukan via SQL di proyek dan saat ini tidak menemukan mismatch.

## Testing

Jalankan unit test:

```bash
npm test
```

Test mencakup mapping status Midtrans dan presentasi UI status.

