# DB Migrations Workflow (Supabase)

Goal: **repo dan database selalu sinkron**. Source of truth ada di `supabase/migrations/`.

## Aturan Utama

- Jangan “edit manual” schema/RLS/RPC di Supabase Dashboard untuk production tanpa diikuti langkah sinkronisasi ke repo.
- Setiap perubahan database harus berakhir sebagai **migration file** yang di-commit.
- MCP/SQL/CLI dipakai untuk **debug/verify**, tapi hasil finalnya harus masuk ke migration.

## Flow Harian (Recommended)

1. Buat perubahan schema/RLS/RPC:
   - Ideal: kerjakan di local Supabase atau Supabase branch/dev env.
2. Generate migration dari perubahan:
   - `supabase db diff -f <nama_migrasi>`
3. Review migration SQL (pastikan aman dan idempotent kalau bisa).
4. Apply ke target DB:
   - `supabase db push`
5. Commit ke git (migration + perubahan app yang bergantung).

Catatan: untuk migration baru, prefer format versi timestamp 14-digit (bawaan `supabase migration new`) supaya ordering konsisten.

## Kalau Terlanjur Ubah DB via Dashboard/MCP

1. Tarik history migration dari remote:
   - `supabase migration fetch`
2. Pastikan file di `supabase/migrations/` sesuai dengan remote.
3. Commit perubahan itu ke git.

Ini mencegah schema drift: “DB sudah berubah, repo belum”.

## Checklist Sinkronisasi (Sebelum Deploy)

- `supabase migration list` tidak menunjukkan mismatch yang tidak kamu pahami.
- `npm run build` lolos.
- Perubahan DB yang critical (RLS/RPC) punya migration file dan sudah direview.

## Kapan Perlu “Baseline/Squash” Lagi?

Tidak ada angka baku. Pertimbangkan baseline baru kalau:

- jumlah migration sudah besar (mis. ratusan) dan onboarding/reset environment jadi lambat, atau
- banyak migration lama yang isinya “cleanup”/eksperimen dan bikin sulit audit.

Prinsip penting:

- Jangan rewrite history migrations yang sudah dipakai production tanpa strategi yang jelas.
- Cara aman biasanya: buat baseline baru untuk environment baru (atau project baru), lalu lanjutkan migration incremental setelah baseline.

