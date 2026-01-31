# Panduan Admin: Input Produk (Shop)

Dokumen ini dipakai saat menambah/mengedit produk di **Admin → Store & Inventory → Add Product**.

## Checklist Cepat (sebelum klik Save)

- Isi: Name, Slug, Product SKU, Category
- Tambah minimal 1 gambar (maks 3)
- Pastikan minimal 1 variant dan setiap variant punya: Name, SKU, Price (> 0)

## Aturan Field (Wajib vs Opsional)

**Produk**
- Name: wajib
- Slug: wajib dan harus unik
- Product SKU: wajib dan harus unik
- Category: wajib
- Description: opsional
- Active: opsional (kalau dimatikan, produk tidak muncul di Shop)

**Variant**
- Variant Name: wajib
- Variant SKU: wajib dan harus unik (unik untuk semua variant di semua produk)
- Price: wajib, angka > 0
- Stock: boleh 0 (artinya habis)
- Size: opsional (boleh kosong)
- Color: opsional (boleh kosong)

## Size/Color boleh kosong? Boleh isi apa?

- **Boleh kosong** kalau produknya tidak butuh ukuran/warna.
- **Boleh diisi bebas** sebagai teks:
  - Contoh ukuran: `5cm`, `10cm`, `S`, `M`, `L`, `XL`, `Medium`
  - Contoh warna: `Black`, `Nude`, `Red`, `Brown`
- Rekomendasi agar konsisten:
  - 1 produk gunakan 1 gaya ukuran (mis. semua `S/M/L`, atau semua `cm`)
  - Kalau cosmetic, gunakan `Shade Name` (mis. “Rose”, “Mocha”) di Variant Name, dan Size/Color boleh kosong

## Price boleh kosong? Tidak

- Price **tidak boleh kosong** dan harus **lebih dari 0**.
- Cara input: boleh ketik `100000` atau `100.000`. Sistem akan menyimpan sebagai angka.

## SKU harus unik? Ya (dua level)

**1) Product SKU (produk induk)**
- Harus unik antar produk.
- Rekomendasi format: `BRAND-KATEGORI-KODE`
  - Contoh: `HDL-MA`, `PROD-001`, `SPARK-KEYCHAIN-01`

**2) Variant SKU (item yang dijual)**
- Harus unik antar semua variant (global).
- Rekomendasi format: `PRODUCTSKU-VAR`
  - Contoh: `HDL-MA-DEF`, `HDL-MA-RED`, `HDL-MA-5CM`

## Slug itu apa dan gimana cara isi yang benar?

- Slug dipakai di URL dan harus unik.
- Normalisasi yang aman:
  - Huruf kecil, pakai `-` sebagai pemisah
  - Tidak pakai simbol aneh
- Contoh:
  - Name: `Headliner Main Act`
  - Slug: `headliner-main-act`

## Gambar Produk (Upload)

- Minimal 1 gambar wajib (maks 3)
- Format: JPG/PNG/WEBP
- Maks ukuran: 2MB per gambar
- Urutan gambar:
  - Gambar pertama = primary (muncul pertama di Shop & detail)
  - Customer bisa swipe (mobile) atau klik panah (desktop) untuk lihat gambar lain

## Contoh Setup yang Disarankan

**Case A — 1 variant saja (paling simpel)**
- Product SKU: `HDL-MA`
- Variant:
  - Name: `Default`
  - SKU: `HDL-MA-DEF`
  - Price: `100000`
  - Stock: `100`

**Case B — Produk ukuran (apparel/merch)**
- Product SKU: `SPARK-TSHIRT`
- Variants:
  - Name: `Size S`, SKU: `SPARK-TSHIRT-S`, Price: `150000`, Stock: `10`, Size: `S`
  - Name: `Size M`, SKU: `SPARK-TSHIRT-M`, Price: `150000`, Stock: `12`, Size: `M`

**Case C — Produk warna (mis. keychain)**
- Product SKU: `SPARK-KEYCHAIN`
- Variants:
  - Name: `Green`, SKU: `SPARK-KEYCHAIN-GRN`, Price: `90000`, Stock: `20`, Color: `Green`
  - Name: `Pink`, SKU: `SPARK-KEYCHAIN-PNK`, Price: `90000`, Stock: `15`, Color: `Pink`

## Troubleshooting Umum

- Error “SKU already exists”: berarti SKU yang dipakai sudah digunakan di produk/variant lain → ganti SKU.
- Gambar tidak muncul di detail: pastikan upload minimal 1 gambar; bila baru deploy, coba hard refresh (Cmd+Shift+R / Ctrl+F5).
- Stock 0 tapi ingin tetap tampil: boleh, customer akan melihat “Habis” dan tidak bisa Add to Cart sampai stock dinaikkan.

