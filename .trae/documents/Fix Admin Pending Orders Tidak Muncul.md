## Temuan Utama
1. Order user (`/my-orders`) menampilkan QR hanya jika `order_products.payment_status === 'paid'` dan `pickup_status === 'pending_pickup'`.
2. Halaman admin (`/admin/product-orders`) menghitung tab Pending dari hasil query `order_products` yang difilter `payment_status='paid'`, lalu client-side filter `pickup_status === 'pending_pickup'`.
3. Jadi kalau user sudah melihat QR (berarti `paid` + `pending_pickup`), maka secara logika tab Pending admin harusnya bertambah 1.

## Root Cause Paling Mungkin
- Query admin ke `order_products` dari frontend kemungkinan **tidak mengembalikan row** (atau error) karena:
  - RLS/policy database membatasi `SELECT` hanya pemilik order (`user_id = auth.uid()`), sehingga admin tidak bisa melihat order user lain.
  - Atau join `users(name,email)` memicu error permission/relasi dan UI saat ini menelan error (kalau error, `orders` diset kosong tanpa pesan).

## Rencana Debug (Read-only dulu, lalu perbaikan)
1. Tambahkan tampilan error pada admin ProductOrders agar kalau query gagal, pesan Supabase tampil (bukan diam-diam jadi 0).
2. Cek kondisi database (SQL):
   - Apakah RLS aktif di `order_products`/`order_product_items`/`users`.
   - Policy apa saja yang berlaku.
   - Pastikan `admin@gmail.com` punya role di `user_role_assignments` untuk `user_id` (auth uid) dengan `role_name` admin/super_admin.
   - Pastikan row order yang dimaksud benar-benar `payment_status='paid'` dan `pickup_status='pending_pickup'`.
3. Implement perbaikan yang paling aman:
   - Jika RLS aktif dan policy hanya untuk owner: buat policy tambahan yang mengizinkan `SELECT` untuk admin (berdasarkan `user_role_assignments`) pada:
     - `order_products` (list + lookup)
     - `order_product_items` (detail)
     - (jika diperlukan) `users` (agar select relasi `users(name,email)` di admin tidak error)
   - Simpan sebagai migration SQL di `supabase/migrations` supaya tidak “bandage patch” dan bisa direplikasi.
4. Rapikan 1 bug terkait admin yang ditemukan saat investigasi:
   - `Login.tsx` memanggil `isAdmin(email)` padahal fungsi itu butuh `userId`. Ini tidak langsung menyebabkan pending=0, tapi berpotensi bikin redirect/login admin tidak konsisten.

## Verifikasi Setelah Fix
- Login sebagai user: `/my-orders` tetap hanya melihat order sendiri.
- Login sebagai admin: `/admin/product-orders` menampilkan pending minimal 1 untuk order user yang belum pickup.
- Flow scan/verify pickup code tetap jalan, dan setelah complete pickup, pending berkurang dan masuk “Selesai”.

Kalau Anda setuju, saya lanjut eksekusi perubahan (UI error + migration RLS + perbaikan kecil login) dan verifikasi end-to-end.