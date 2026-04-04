# Audit Admin Inventory

Status: completed

Tanggal audit terakhir: 2026-04-04

## Konteks

Sektor admin inventory yang sebelumnya berbau ship fast sudah dirapikan pada sesi ini. Fokus perubahan ada di tiga titik: memecah `useInventory` menjadi orchestration tipis dengan helper-layer yang jelas, memisahkan lifecycle upload image dari mutation invoke flow, dan menambah test untuk invalidation, stock-filter fallback, serta diagnostics output.

Verifikasi akhir sesi ini:

- `npm run test -- frontend/src/hooks/inventory/inventoryData.test.ts frontend/src/hooks/inventory/useInventoryRealtimeInvalidation.test.tsx frontend/src/pages/admin/store-inventory/inventoryProductMutations.test.ts frontend/src/pages/admin/store-inventory/useInventoryProductActions.test.ts frontend/src/pages/admin/store-inventory/useStoreInventoryFilters.test.ts frontend/src/pages/admin/StoreInventory.test.tsx` pass
- `npm run build` pass
- `deno check --config supabase/functions/deno.json` untuk seluruh `supabase/functions/**/*.ts` pass

## Temuan Utama

1. Selesai: `useInventory` yang sebelumnya terlalu gemuk sudah dipecah ke layer query shape, fetch strategy, dan realtime invalidation.
2. Selesai: inventory read path tidak lagi mencampur select shape, stock-filter fallback, diagnostics, timeout, dan subscription di satu file.
3. Selesai: inventory mutation frontend tidak lagi menyimpan upload lifecycle dan invoke flow di satu file yang sama.
4. Selesai: boundary admin inventory terhadap payment dan voucher sekarang didokumentasikan sebagai catatan dependency, bukan logic campuran.

## Task Backlog

### Prioritas Tinggi

- [x] Pecah `useInventory` menjadi layer query builder, fetch strategy, dan realtime invalidation.
- [x] Pindahkan select shape dan mapping inventory ke helper atau schema terpisah agar shape data tidak tersebar.

### Prioritas Menengah

- [x] Pisahkan upload image lifecycle dari mutation invoke flow di inventory admin.
- [x] Tambah test untuk invalidation, stock-filter RPC fallback, dan diagnostics output.
- [x] Dokumentasikan dependency inventory terhadap payment dan voucher hanya sebagai boundary note, bukan logic utama.

### Prioritas Rendah

- [x] Audit ulang hook dan helper inventory yang masih membaca terlalu banyak concern UI, transport, dan diagnostics dalam satu file.

## Boundary Dengan Sektor Lain

- Voucher atau payment hanya dicatat bila berdampak langsung ke inventory admin, misalnya stock reservation atau representasi status produk.
- Product checkout tidak dibahas di sektor ini.
- Ownership auth dan token recovery tetap menjadi backlog sektor `auth dan session`.
- Payment finality, voucher usage, dan checkout policy tetap menjadi backlog sektor `payment dan checkout`.

## File Kunci

- `frontend/src/hooks/useInventory.ts`
- `frontend/src/hooks/inventory/inventoryTypes.ts`
- `frontend/src/hooks/inventory/inventoryQuerySchema.ts`
- `frontend/src/hooks/inventory/inventoryData.ts`
- `frontend/src/hooks/inventory/useInventoryRealtimeInvalidation.ts`
- `frontend/src/hooks/inventory/inventoryData.test.ts`
- `frontend/src/hooks/inventory/useInventoryRealtimeInvalidation.test.tsx`
- `frontend/src/pages/admin/store-inventory/inventoryProductMutations.ts`
- `frontend/src/pages/admin/store-inventory/inventoryProductImageLifecycle.ts`
- `frontend/src/pages/admin/store-inventory/inventoryProductMutations.test.ts`
- `frontend/src/pages/admin/store-inventory/useInventoryProductActions.ts`
- `frontend/src/pages/admin/store-inventory/useStoreInventoryFilters.ts`
- `frontend/src/pages/admin/StoreInventory.tsx`
- `frontend/src/pages/admin/StoreInventory.test.tsx`

## Kriteria Selesai

- [x] `useInventory` terpecah ke komponen yang lebih kecil dengan responsibility yang jelas.
- [x] Select shape dan mapping inventory tidak lagi tersebar di hook utama, page, dan mutation helper sekaligus.
- [x] Upload lifecycle image terpisah dari invoke flow mutation inventory.
- [x] Test untuk invalidation, fallback, dan diagnostics tersedia dan stabil.
- [x] Dependency inventory terhadap payment atau voucher terdokumentasi sebagai boundary, bukan logic campuran.
