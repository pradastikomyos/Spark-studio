# ImageKit Migration Runbook

Runbook ini adalah peta acuan implementasi untuk memindahkan `product-images` dari Supabase Storage ke ImageKit, lalu menurunkan project ini dari organisasi Supabase `Pro` ke organisasi `Free`.

Dokumen ini sengaja ditulis operasional, bukan konseptual. Fokusnya adalah urutan kerja yang aman, checkpoint verifikasi, rollback, dan file yang benar-benar akan disentuh.

## 1. Tujuan

Tujuan utama:

1. Mengeluarkan bucket `product-images` dari Supabase Storage.
2. Memindahkan upload, delivery, thumbnail, dan delete flow gambar produk ke ImageKit.
3. Menurunkan total penggunaan storage Supabase ke bawah limit `Free`.
4. Memindahkan project ke organisasi Supabase `Free` yang terpisah dari organisasi `Pro`.

Non-tujuan:

1. Tidak memigrasikan bucket lain seperti `banners`, `beauty-images`, `dressing-room-images`, atau aset non-produk.
2. Tidak mengganti Supabase sebagai database, auth, atau edge functions.
3. Tidak mengubah schema produk secara besar-besaran di luar metadata yang dibutuhkan untuk lifecycle file.

## 2. Kondisi Saat Ini

Berdasarkan audit per `2026-03-27`:

1. Bucket `product-images` memakai sekitar `1.22 GiB`.
2. Total storage project sekitar `1.38 GiB`.
3. Jika `product-images` dikeluarkan, sisa storage Supabase diperkirakan sekitar `164 MB`.
4. Database project sekitar `22.78 MB`.

Implikasi:

1. Secara teknis project ini dapat masuk batas `Free` Supabase setelah `product-images` keluar.
2. Secara billing, project tidak bisa menjadi `Free` selama masih berada di organisasi `Pro`.
3. End-state yang benar adalah: project dipindahkan ke organisasi `Free` terpisah.

Snapshot eksekusi aktual per `2026-03-28`:

1. Backup bucket `product-images` sudah selesai ke folder lokal `backups/product-images/`.
2. Manifest migrasi runtime sudah selesai dengan `1598` row `product_images` yang direferensikan aplikasi.
3. Seluruh `1598` row `product_images` sudah dimigrasikan ke ImageKit dan metadata provider-nya lengkap.
4. Frontend production sudah dideploy dan dirapikan agar tidak lagi punya dependency langsung ke bucket `product-images`.
5. Bucket `product-images` Supabase sudah dikosongkan dan dihapus.
6. Audit pasca-cleanup menunjukkan `0` referensi legacy Supabase di `products.image_url`, `product_images`, dan `product_variants.attributes`.
7. Backup lokal tetap dipertahankan sebagai rollback artefak terakhir meskipun bucket remote sudah dihapus.

## 3. Sumber Integrasi yang Relevan

File yang sebelumnya mengikat gambar produk ke Supabase Storage:

1. `frontend/src/utils/uploadProductImage.ts`
2. `frontend/src/utils/inventoryImage.ts`
3. `supabase/migrations/20260206000000_baseline.sql`

Temuan penting:

1. `product_images.image_url` saat ini bertipe `TEXT`, jadi URL provider baru dapat dipakai tanpa membongkar relasi tabel.
2. Upload produk sekarang sudah masuk ke ImageKit melalui Edge Function `imagekit-auth`.
3. Thumbnail inventory admin sekarang memakai URL ImageKit atau URL asli, tanpa transform Supabase untuk gambar produk.
4. Pola backend server-side yang dipakai tetap `supabase.functions.invoke(...)`, jadi tidak perlu backend tambahan di luar stack yang sudah ada.

## 4. Kriteria Sukses

Migrasi dianggap selesai hanya jika seluruh kondisi ini terpenuhi:

1. Upload gambar produk baru tidak lagi masuk ke Supabase Storage.
2. Semua baris aktif pada `public.product_images` sudah menunjuk ke URL ImageKit.
3. Delete gambar produk menghapus file dari ImageKit dan record DB dengan aman.
4. Helper thumbnail admin tidak lagi memakai transform Supabase untuk gambar produk.
5. File lama di bucket `product-images` Supabase sudah dibersihkan setelah soak period.
6. Project berhasil dipindahkan ke organisasi Supabase `Free`.

## 5. Prasyarat

Prasyarat operasional:

1. `supabase` CLI sudah aktif dan linked ke project target.
2. Akses owner ke organisasi sumber dan akses minimal member ke organisasi target `Free`.
3. Akun ImageKit aktif dan dapat membuat API keys.
4. Window kerja dengan freeze kecil untuk admin upload produk.

Prasyarat konfigurasi:

1. `IMAGEKIT_PUBLIC_KEY`
2. `IMAGEKIT_PRIVATE_KEY`
3. `IMAGEKIT_URL_ENDPOINT`
4. `IMAGEKIT_PRODUCT_IMAGES_BASE_PATH`
5. `SUPABASE_URL`
6. `SUPABASE_ANON_KEY`
7. `SUPABASE_SERVICE_ROLE_KEY`

Konvensi yang direkomendasikan:

1. Path root ImageKit untuk gambar produk: `/products`
2. Path file: `/products/<product_id>/<uuid>.<ext>`

## 6. Strategi Implementasi

Strategi yang dipakai adalah `dual-run cutover`, bukan `big-bang`.

Urutan besar:

1. Backup dan inventaris dahulu.
2. Tambah metadata DB untuk provider baru.
3. Deploy auth/delete Edge Functions untuk ImageKit.
4. Alihkan upload baru ke ImageKit.
5. Migrasikan file lama batch per batch.
6. Verifikasi penuh.
7. Hapus file lama dari Supabase.
8. Transfer project ke organisasi `Free`.

Kenapa strategi ini dipilih:

1. Risiko broken image lebih rendah.
2. Rollback lebih sederhana.
3. Kita bisa memisahkan masalah runtime baru dari masalah data lama.

## 7. Perubahan Schema yang Direkomendasikan

`image_url` saja cukup untuk render, tetapi tidak cukup baik untuk operasi hapus dan audit provider. Karena itu, migration DB yang direkomendasikan adalah menambah metadata provider di `public.product_images`.

Kolom yang direkomendasikan:

1. `image_provider TEXT NOT NULL DEFAULT 'supabase'`
2. `provider_file_id TEXT NULL`
3. `provider_file_path TEXT NULL`
4. `provider_original_url TEXT NULL`
5. `migrated_at TIMESTAMPTZ NULL`

Aturan data:

1. Record lama di-backfill sebagai `image_provider = 'supabase'`.
2. Record baru dari ImageKit harus menyimpan:
   - `image_url`
   - `image_provider = 'imagekit'`
   - `provider_file_id`
   - `provider_file_path`
3. `provider_original_url` hanya dipakai untuk file hasil migrasi, bukan upload baru.

Kenapa ini wajib direkomendasikan:

1. ImageKit delete idealnya ditujukan ke `fileId`, bukan menebak dari URL.
2. Audit dan cleanup jadi deterministik.
3. Rollback per-record jadi mungkin.

## 8. Perubahan Kode yang Direncanakan

### 8.1 Frontend

File yang akan diubah:

1. `frontend/src/utils/uploadProductImage.ts`
2. `frontend/src/utils/inventoryImage.ts`

File baru yang kemungkinan ditambahkan:

1. `frontend/src/lib/imagekit.ts`
2. `frontend/src/types/imagekit.ts`

Perubahan pada `uploadProductImage.ts`:

1. Hapus upload langsung ke Supabase Storage untuk gambar produk.
2. Minta parameter auth upload ke Edge Function baru.
3. Upload file ke ImageKit memakai `@imagekit/javascript`.
4. Kembalikan URL ImageKit dan metadata file.
5. Simpan record DB dengan metadata provider.

Perubahan pada `inventoryImage.ts`:

1. Deteksi apakah URL adalah ImageKit atau legacy Supabase.
2. Untuk URL ImageKit, bangun thumbnail dengan transform URL ImageKit.
3. Untuk URL Supabase lama, fallback tetap dipertahankan selama masa migrasi.

### 8.2 Edge Functions

Function baru yang direkomendasikan:

1. `supabase/functions/imagekit-auth/index.ts`
2. `supabase/functions/imagekit-delete/index.ts`

Peran `imagekit-auth`:

1. Memvalidasi JWT user.
2. Menghasilkan `token`, `signature`, dan `expire` untuk client upload.
3. Mengembalikan `publicKey` dan `urlEndpoint`.

Peran `imagekit-delete`:

1. Memvalidasi JWT user.
2. Memastikan requester memiliki hak admin/editor yang sama dengan flow admin produk saat ini.
3. Menghapus asset ImageKit berdasarkan `provider_file_id`.

Catatan implementasi:

1. Jangan expose `IMAGEKIT_PRIVATE_KEY` ke frontend.
2. Jangan menghapus asset ImageKit langsung dari browser.

### 8.3 Script Migrasi Data

Script baru yang direkomendasikan:

1. `scripts/migrate-product-images-to-imagekit.ts`
2. `scripts/imagekit-migrate-product-images.mjs`
3. `scripts/imagekit-migration-status.mjs`

Script ini harus support:

1. `--dry-run`
2. `--batch-size`
3. `--start-after-id`
4. `--limit`
5. `--only-product-id`
6. `--env-file`
7. `--no-resume`
8. `--fail-fast`

Output wajib:

1. `backups/product-images-manifest.csv`
2. `backups/product-images-migration-results.jsonl`
3. `backups/product-images-migration-summary.json`
4. `backups/product-images-migration-status.json`
5. Ringkasan sukses/gagal per batch

Perilaku script:

1. Ambil record `product_images` yang masih `image_provider = 'supabase'`.
2. Download/import file dari URL public Supabase.
3. Upload ke ImageKit.
4. Simpan `fileId`, `filePath`, `url`, dan timestamp hasil migrasi.
5. Update satu record DB hanya setelah upload sukses.
6. Jangan menghapus file lama Supabase pada fase ini.

Env file lokal yang direkomendasikan:

1. `.env.imagekit-migration`
2. Contoh template: `.env.imagekit-migration.example`

Isi minimum:

1. `IMAGEKIT_PRIVATE_KEY`
2. `IMAGEKIT_URL_ENDPOINT`
3. `IMAGEKIT_PRODUCT_IMAGES_BASE_PATH`

Catatan:

1. `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` dapat di-resolve otomatis dari Supabase CLI selama repo sudah linked dan sesi CLI masih aktif.
2. Jika auto-resolve gagal, dua nilai Supabase tersebut tetap bisa diisi manual di `.env.imagekit-migration`.

## 9. Fase Eksekusi

### Fase 0: Freeze dan Baseline

Checklist:

1. Umumkan freeze upload produk selama window kerja pertama.
2. Pastikan branch kerja khusus migrasi dibuat.
3. Simpan hasil audit storage, DB size, dan object count sebagai baseline.
4. Pastikan semua env dan secret sudah tersedia.

Go/No-Go:

1. Stop jika akses owner ke organisasi Supabase target belum siap.
2. Stop jika akun ImageKit belum aktif atau URL endpoint belum ada.

### Fase 1: Backup dan Inventaris

Checklist:

1. Backup bucket `product-images` ke lokal.
2. Buat manifest DB untuk seluruh `product_images`.
3. Simpan checksum atau setidaknya jumlah file hasil backup.

Command dasar backup:

```powershell
New-Item -ItemType Directory -Force -Path ".\backups\product-images" | Out-Null
supabase storage cp -r "ss:///product-images" ".\backups\product-images" --experimental
```

Target hasil:

1. Semua file bucket ada di folder backup.
2. Ada manifest yang bisa dipakai untuk audit dan resume.

Go/No-Go:

1. Jangan lanjut jika backup belum diverifikasi.

### Fase 2: Migration DB

Checklist:

1. Tambah kolom provider metadata pada `product_images`.
2. Backfill nilai default untuk record lama.
3. Update type definitions frontend bila dibutuhkan.

Target hasil:

1. Aplikasi existing tetap jalan tanpa perubahan perilaku.
2. Schema siap menerima record ImageKit.

Go/No-Go:

1. Jangan lanjut ke deploy runtime baru sebelum migration apply bersih di remote.

### Fase 3: Integrasi Edge Function

Checklist:

1. Tambah `imagekit-auth`.
2. Tambah `imagekit-delete`.
3. Tambah helper shared bila ada util auth yang perlu dipakai ulang.
4. Set secret ImageKit di Supabase project.
5. Deploy function ke project target.

Verifikasi:

1. `imagekit-auth` hanya memberi token untuk user valid.
2. `imagekit-delete` menolak request tanpa auth.

### Fase 4: Integrasi Frontend

Checklist:

1. Tambah dependency `@imagekit/javascript`.
2. Ganti flow upload produk ke ImageKit.
3. Ganti helper thumbnail inventory.
4. Pertahankan fallback legacy URL Supabase.
5. Pastikan save/delete DB tetap sinkron.

Verifikasi:

1. Upload 1 gambar produk baru dari admin.
2. Buka daftar inventory.
3. Pastikan thumbnail muncul.
4. Hapus gambar baru tersebut.
5. Pastikan file hilang dari ImageKit dan row hilang dari DB.

Go/No-Go:

1. Jangan migrasikan file lama sebelum upload baru stabil.

### Fase 5: Cutover Upload Baru

Checklist:

1. Deploy frontend baru.
2. Lakukan smoke test admin upload.
3. Pastikan semua gambar produk baru sejak titik ini tersimpan di ImageKit.

Target hasil:

1. Tidak ada tambahan object baru di bucket `product-images` Supabase untuk flow produk.

### Fase 6: Migrasi File Lama

Checklist:

1. Jalankan script migrasi dalam mode `dry-run`.
2. Jalankan batch kecil terlebih dahulu, misalnya 25 record.
3. Verifikasi storefront dan admin.
4. Naikkan batch size bertahap bila stabil.

Command awal yang direkomendasikan:

```powershell
Copy-Item .env.imagekit-migration.example .env.imagekit-migration
npm run imagekit:migrate:dry
npm run imagekit:migration:status
```

Command batch produksi pertama yang direkomendasikan:

```powershell
node scripts/imagekit-migrate-product-images.mjs --env-file .env.imagekit-migration --batch-size 25 --limit 25 --fail-fast
node scripts/imagekit-migration-status.mjs --env-file .env.imagekit-migration
```

Aturan batch:

1. Jangan migrasi semua file sekaligus pada run pertama.
2. Simpan log sukses dan gagal per batch.
3. Record gagal harus bisa diulang tanpa menggandakan data.

Target hasil:

1. Semua row `product_images` aktif menjadi `image_provider = 'imagekit'`.
2. Tidak ada broken image pada halaman utama produk dan inventory admin.

### Fase 7: Soak Period

Durasi yang direkomendasikan:

1. Minimal `3-7 hari`.

Keputusan operasional yang dikunci untuk migrasi ini:

1. Buffer rollback minimal `24 jam` setelah cutover runtime.
2. File Supabase lama tidak dihapus sebelum buffer `24 jam` ini lewat.
3. Setelah buffer lewat, cleanup boleh dilanjutkan bila monitoring tidak menunjukkan broken image yang material.

Checklist:

1. Pantau broken image.
2. Pantau delete flow.
3. Pantau page yang memakai helper inventory thumbnail.
4. Pastikan tidak ada proses lama yang masih menulis ke bucket `product-images`.

### Fase 8: Cleanup Supabase Storage

Checklist:

1. Buat daftar object Supabase yang sudah tidak direferensikan lagi.
2. Hapus via Storage API/CLI, bukan SQL.
3. Hapus bertahap dengan batch aman.
4. Pastikan `35` object orphan hasil audit awal ikut masuk daftar cleanup.

Aturan penting:

1. Jangan delete via SQL.
2. Jangan cleanup sebelum soak period lolos.

Target hasil:

1. Bucket `product-images` kosong atau tidak lagi dipakai runtime.
2. Tidak ada lagi object orphan yang tertinggal dari bucket lama.

### Fase 9: Transfer Project ke Organisasi Free

Checklist:

1. Buat organisasi Supabase `Free` baru.
2. Pastikan Anda owner di source org.
3. Pastikan Anda member di target org.
4. Pastikan project tidak memakai add-on atau konfigurasi yang incompatible dengan `Free`.
5. Lakukan transfer dari project settings.

Catatan:

1. Supabase mendokumentasikan potensi downtime singkat `1-2 menit` saat pindah dari paid ke free.
2. Ini adalah langkah yang benar untuk lepas dari Pro. Mengurangi storage saja tidak cukup jika project tetap berada di org Pro.

## 10. Test Matrix

Sebelum cleanup final, uji minimal skenario ini:

1. Upload 1 gambar JPG.
2. Upload 1 gambar PNG.
3. Upload 1 gambar WEBP.
4. Upload file dengan `file.type` kosong dari Windows.
5. Upload melebihi limit size.
6. Upload multi-image per produk.
7. Ubah urutan gambar.
8. Delete gambar produk baru.
9. Render halaman inventory admin.
10. Render halaman detail produk publik.
11. Render produk yang masih legacy Supabase selama masa transisi.
12. Re-run script migrasi pada record yang sudah sukses untuk memastikan idempotensi.

## 11. Rollback Plan

Rollback Fase 2:

1. Jika migration DB bermasalah, rollback schema sebelum runtime baru dideploy.

Rollback Fase 4:

1. Jika upload baru ke ImageKit gagal, kembalikan `uploadProductImage.ts` ke Supabase flow.
2. Jangan ubah data lama.

Rollback Fase 6:

1. Jika migrasi batch menemukan issue besar, hentikan script.
2. Record yang belum dimigrasikan tetap aman di Supabase.
3. Record yang sudah dimigrasikan tetap dapat dilayani dari ImageKit.
4. Cleanup Supabase tidak boleh dimulai sampai issue selesai.

Rollback Fase 8:

1. Tidak ada rollback penuh jika object Supabase sudah dihapus.
2. Karena itu backup lokal bucket adalah wajib sebelum cleanup.

Rollback Fase 9:

1. Transfer org dilakukan paling akhir, setelah runtime stabil.
2. Jika transfer belum dilakukan, biaya masih aman dikendalikan tanpa mempengaruhi aplikasi.

## 12. Urutan File yang Akan Disentuh

Urutan kerja yang direkomendasikan:

1. Tambah migration baru di `supabase/migrations/`
2. Tambah function `supabase/functions/imagekit-auth/`
3. Tambah function `supabase/functions/imagekit-delete/`
4. Tambah helper frontend `frontend/src/lib/imagekit.ts`
5. Ubah `frontend/src/utils/uploadProductImage.ts`
6. Ubah `frontend/src/utils/inventoryImage.ts`
7. Tambah script `scripts/migrate-product-images-to-imagekit.ts`
8. Tambah dokumentasi env dan rollout checklist

## 13. Keputusan yang Perlu Dikunci Sebelum Implementasi

Sebelum coding dimulai, keputusan ini harus dikunci:

1. Apakah metadata provider akan ditaruh langsung di `product_images` atau di tabel terpisah.
2. Apakah path ImageKit memakai UUID murni atau nama file asli ditambah UUID suffix.
3. Apakah masa soak diset `3 hari` atau `7 hari`.
4. Apakah cleanup Supabase dilakukan total sekaligus atau per-folder `product_id`.

Rekomendasi saya:

1. Simpan metadata provider langsung di `product_images`.
2. Pakai UUID plus ekstensi asli.
3. Soak minimal `7 hari` untuk migrasi produksi pertama.
4. Cleanup Supabase per-folder `product_id` agar audit lebih mudah.

## 14. Definisi Done

Pekerjaan ini baru dianggap selesai jika:

1. Dokumen ini sudah dieksekusi penuh.
2. Tidak ada lagi upload baru ke bucket `product-images` Supabase.
3. Semua row `product_images` aktif sudah `image_provider = 'imagekit'`.
4. Bucket `product-images` Supabase sudah tidak menjadi dependency runtime.
5. Project sudah berpindah ke organisasi `Free`.
6. Monitoring pasca-cutover tidak menunjukkan broken image yang material.

Status terhadap definisi done per `2026-03-27`:

1. Poin `2` tercapai untuk runtime baru setelah deploy frontend production.
2. Poin `3` sudah tercapai penuh: `1598/1598` row `product_images` sekarang `image_provider = 'imagekit'`.
3. Poin `4` belum final karena bucket lama masih ditahan sebagai rollback buffer `24 jam`.
4. Poin `5` belum dikerjakan; transfer ke org `Free` adalah fase terakhir.
