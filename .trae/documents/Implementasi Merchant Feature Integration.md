## Temuan Review (kondisi repo & DB saat ini)
- Admin page **StoreInventory.tsx** sudah bisa read produk+variant dari Supabase, tapi **Add Product button belum fungsional** dan belum ada Edit/Delete. [StoreInventory.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/admin/StoreInventory.tsx)
- Public page **Shop.tsx** masih hardcoded (mock 6 produk), belum fetch database. [Shop.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/Shop.tsx)
- Di DB:
  - `products` punya `sku` dan `slug` **UNIQUE**; `product_variants.sku` juga **UNIQUE**.
  - `products` **belum punya kolom image_url** (jadi perlu strategi penyimpanan URL gambar).
  - Storage bucket `product-images` **belum ada**.
  - RLS untuk `products/product_variants/categories/order_products` **masih OFF** (security note).

## Keputusan Implementasi (sesuai izin Anda)
- Image size limit: **2MB per file**, jpg/png.
- Variant attributes: MVP support **size** dan **color** via JSON `attributes` (string).
- Delete: **soft delete** pakai `deleted_at`.

## Rencana Implementasi (tanpa tambahan docs)

### 1) Tambah Primary Image Field (DB)
Karena `products` belum punya field image, lakukan salah satu opsi:
- **Opsi MVP (disarankan):** tambah kolom `products.image_url text null`.
- Jika Anda ingin multi-image: buat tabel `product_images` (lebih besar scope).

Saya akan implement frontend dengan asumsi **opsi MVP** (`products.image_url`). Jika kolom belum dibuat, UI akan menampilkan error yang jelas.

### 2) ProductFormModal (Create/Edit)
- Buat komponen modal reusable untuk create/edit:
  - Fields: name, slug (auto), description, category dropdown, type, SKU, is_active.
  - Variants: table inline add/edit/remove (name, sku, online_price, offline_price, stock, attributes).
  - Image upload: drag&drop / file picker → upload ke Supabase Storage → simpan URL ke `products.image_url`.
  - Validasi:
    - required fields
    - handle duplicate SKU/slug (error 23505) dengan pesan user-friendly.

### 3) Upload Helper (Supabase Storage)
- Tambah helper `uploadProductImage(file, productId)`:
  - Validate size/type
  - Upload ke `product-images/{productId}/{uuid}.jpg|png`
  - Return public URL (atau path + getPublicUrl)

### 4) StoreInventory CRUD Integration
- Refactor StoreInventory agar menyimpan data **product-level** (bukan flat per-variant) supaya edit/delete lebih natural.
- Tambah state:
  - showProductForm, editingProduct, deletingProduct
- CRUD:
  - Create: insert `products` → insert `product_variants` (best-effort rollback jika variant gagal)
  - Edit: update `products` + upsert variants (insert/update/delete sesuai perubahan)
  - Delete: update `products.deleted_at=now()` (soft delete)
- UI:
  - Wire Add Product button
  - Tambah Edit/Delete actions
  - Confirmation dialog untuk delete

### 5) Storage Bucket Setup
- Cek bucket `product-images`.
- Jika tidak ada, coba create via Supabase (SQL insert ke `storage.buckets` atau via dashboard).
  - Jika environment membatasi write dari automation, saya akan beri fallback instruksi dashboard.

### 6) Shop.tsx: Connect ke Database
- Ganti mock data dengan fetch:
  - products (is_active=true, deleted_at is null) + categories + variants
- Loading skeleton + error state
- Filter kategori pakai `categories` table (real)
- Render image:
  - pakai `products.image_url` jika ada, kalau null pakai placeholder.

### 7) Tests & Verification
- Karena repo saat ini belum punya React Testing Library, saya akan:
  - Tambah unit test untuk helper util (slugify/validator/upload helper logic) memakai Vitest.
  - Verifikasi end-to-end dengan `npm run lint` + `npm run test` + `npm run build`.

## Output Akhir yang Anda Dapat
- Admin bisa Create/Edit/Soft Delete produk + variants + upload gambar.
- Shop menampilkan produk real dari DB dan filter kategori real.
- Build/lint/test lulus.

Jika Anda konfirmasi plan ini, saya langsung mulai implementasi tahap 1–7 di repo dan menyiapkan SQL minimal untuk kolom `image_url` + bucket `product-images` (tanpa membuat file dokumentasi).