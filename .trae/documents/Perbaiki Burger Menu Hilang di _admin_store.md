## Temuan
- Halaman `/admin/store` (StoreInventory) memanggil `AdminLayout` tanpa `menuSections`, jadi sidebar hanya menampilkan `ADMIN_MENU_ITEMS` (Dasbor, Galeri Fashion) dan item “Toko/Pesanan Produk” menghilang.
- `defaultActiveMenuId` di StoreInventory diset ke `"orders"`, padahal ID menu yang benar di `adminMenu.ts` adalah `"order-products"`. Ini bikin state menu aktif tidak pernah cocok.
- Tombol hamburger (ikon menu) di `AdminLayout` memang `md:hidden` (hanya muncul di mobile). Jadi di desktop ia memang tidak tampil; tapi masalah yang kamu tunjukkan adalah item menu “Toko/Pesanan Produk” yang hilang.

## Perubahan yang Akan Dibuat
1. Update `src/pages/admin/StoreInventory.tsx`:
   - Tambahkan `menuSections={ADMIN_MENU_SECTIONS}` saat memanggil `AdminLayout`.
   - Ubah `defaultActiveMenuId` menjadi `"order-products"`.
   - Hapus/benarkan mapping `menuItems={ADMIN_MENU_ITEMS.map(...)}` yang saat ini mencari `id === 'orders'` (tidak ada). Cukup pakai `ADMIN_MENU_ITEMS` apa adanya.
2. Verifikasi behavior:
   - Jalankan dev server, buka `/admin/dashboard` lalu klik “Pesanan Produk” → pastikan sidebar tetap lengkap (sections tetap muncul) dan item “Pesanan Produk” tetap ada.
   - Pastikan highlight/active menu berada di “Pesanan Produk”.

## Validasi
- Build TypeScript.
- Lint.
- Jalankan test (Vitest) untuk memastikan tidak ada regresi.

Kalau setelah ini kamu juga ingin tombol hamburger muncul di desktop (untuk collapse sidebar), itu bisa jadi enhancement terpisah; tapi fix bug hilangnya menu akan selesai dengan langkah di atas.