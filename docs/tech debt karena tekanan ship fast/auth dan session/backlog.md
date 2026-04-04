# Audit Auth dan Session

Status: open

Tanggal audit terakhir: 2026-04-04

## Konteks

Sektor ini mencakup ownership auth/session, recovery policy, token freshness, dan boundary fetch yang bergantung pada sesi login. Fokus backlog ini adalah mengurangi ship-fast patterns yang masih membuat auth flow terlalu rapuh dan terlalu tersebar di banyak layer.

## Temuan Utama

1. High: startup auth masih bisa memaksa logout sesi valid saat `getSession()` lambat.
2. High: ownership auth/session belum single-owner.
3. Medium: `AuthContext` terlalu gemuk.
4. Medium: validasi session dan helper token terduplikasi.
5. Medium: auth-aware fetchers masih punya policy sendiri.

## Task Backlog

### Prioritas Tinggi

- [ ] Pecah `AuthContext` menjadi orchestration tipis plus service/hooks terpisah.
- [ ] Hapus forced logout berbasis timeout pada init auth.
- [ ] Tetapkan satu owner resmi untuk refresh dan token recovery.

### Prioritas Menengah

- [ ] Satukan contract validasi session.
- [ ] Rapikan auth-aware fetch boundary agar tidak baca session sendiri.
- [ ] Tambah test untuk slow init, network refresh, user switch, dan 401 retry.

### Prioritas Rendah

- [ ] Audit ulang helper auth yang masih membaca sesi secara lokal setelah contract baru masuk.

## Boundary Dengan Sektor Lain

- Booking success dan payment page boleh disebut hanya dari sisi ownership auth.
- Business payment logic tetap masuk sektor `payment dan checkout`.
- Inventory admin tidak dibahas di file ini kecuali ada dependency session langsung.

## File Kunci

- `frontend/src/contexts/AuthContext.tsx`
- `frontend/src/utils/sessionValidation.ts`
- `frontend/src/utils/auth.ts`
- `frontend/src/lib/fetchers.ts`
- `frontend/src/hooks/useSessionRefresh.ts`
- `frontend/src/hooks/useIdleTabSessionRefresh.ts`
- `frontend/src/pages/product-checkout/useProductCheckoutController.ts`
- `frontend/src/pages/booking-success/bookingSuccessSync.ts`

## Kriteria Selesai

- Auth init tidak lagi mengubah timeout recovery menjadi forced logout.
- Refresh/token recovery punya satu owner yang jelas.
- Contract validasi session dipakai konsisten oleh semua consumer.
- Auth-aware fetcher tidak lagi membaca session dengan policy sendiri.
- Test untuk slow init, network refresh, user switch, dan 401 retry lulus.
