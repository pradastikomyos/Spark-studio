# backend (supabase)

Repo ini tidak memakai backend HTTP tradisional (Express/Nest). Backend ada di folder `supabase/`:

- `supabase/migrations`: schema + rls + perubahan database
- `supabase/functions`: edge functions (Deno) untuk logic server-side (contoh: Midtrans)

## struktur folder yang scalable

```
supabase/
  config.toml
  migrations/
    *.sql
  functions/
    _shared/
      deps.ts
      env.ts
      http.ts
      supabase.ts
      midtrans.ts
      tickets.ts
    create-midtrans-token/
      config.toml
      index.ts
    create-midtrans-product-token/
      config.toml
      index.ts
    sync-midtrans-status/
      config.toml
      index.ts
    complete-product-pickup/
      config.toml
      index.ts
    midtrans-webhook/
      config.toml
      index.ts
```

Prinsipnya:

- `_shared/` berisi utilitas yang dipakai lintas fungsi (env, CORS/HTTP, Midtrans, helper tiket).
- setiap function fokus ke use-case/domain, bukan plumbing berulang.
- `config.toml` per function mengunci `verify_jwt` (webhook: `false`, lainnya: `true`).

## migration plan (lama → baru)

1. Tambahkan `_shared/` dan pindahkan hal-hal generik:
   - CORS headers + handler OPTIONS
   - getter env (Supabase + Midtrans)
   - helper autentikasi (validasi JWT via anon key + Authorization header)
   - helper Midtrans (snap url, status url, signature)
   - helper tiket (normalisasi time slot, update sold capacity, mapping status Midtrans)
2. Update setiap `supabase/functions/*/index.ts` untuk import dari `_shared/` dan hapus duplikasi.
3. Tambahkan `supabase/config.toml` untuk konsistensi local dev + CLI.
4. Tambahkan `config.toml` per function:
   - `midtrans-webhook`: `verify_jwt = false`
   - yang lain: `verify_jwt = true`
5. Pastikan secrets Edge Functions lengkap di Supabase:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MIDTRANS_SERVER_KEY`
   - `MIDTRANS_IS_PRODUCTION`
6. Deploy ulang Edge Functions (satu per satu) dan jalankan smoke test.

## integration guide (frontend ↔ backend)

### env var di frontend (Vercel)

Set di Vercel Project → Settings → Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MIDTRANS_CLIENT_KEY`
- `VITE_MIDTRANS_IS_PRODUCTION`

### memanggil edge functions dari frontend

Pola yang direkomendasikan: `supabase.functions.invoke()` (token user ikut otomatis saat user login).

- `create-midtrans-token` (booking tiket)
- `create-midtrans-product-token` (checkout produk)
- `sync-midtrans-status` (sync status pembayaran)
- `complete-product-pickup` (admin menyelesaikan pickup)

Catatan:

- Function dengan `verify_jwt = true` butuh user login (ada Authorization header).
- `midtrans-webhook` tidak dipanggil dari browser. URL ini dipakai Midtrans untuk callback.

### webhook midtrans

- Set URL callback ke: `https://<PROJECT_REF>.functions.supabase.co/midtrans-webhook`
- Pastikan signature diverifikasi (sudah dilakukan di function) dan `verify_jwt = false`.
- Pastikan function secrets `MIDTRANS_SERVER_KEY` sesuai environment (sandbox vs production).

## checklist validation sebelum deploy

### code & kualitas

- `npm run lint`
- `npm run test`
- `npm run build`

### database

- Semua migrasi ada di `supabase/migrations` dan sudah apply ke project target.
- RLS policy untuk tabel terkait order/purchased tickets/webhook logs sesuai kebutuhan.

### edge functions

- Secrets sudah terset di Supabase (service role + midtrans).
- `midtrans-webhook` sudah `verify_jwt = false` dan endpoint bisa menerima callback Midtrans.
- Function lain tetap `verify_jwt = true` dan reject request tanpa Authorization.

### end-to-end smoke test (minimum)

- Buat booking tiket → dapat snap token → bayar di Midtrans sandbox → webhook update status → tiket terbentuk.
- Checkout produk → stok reserved → bayar → webhook update status → pickup code valid → complete pickup mengurangi stock & reserved.

