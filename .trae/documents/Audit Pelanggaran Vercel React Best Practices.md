## Review Temuan (Claude) + Insight
- **Banyak poinnya relevan**, terutama tentang code splitting, waterfall query, dan memoization.
- **Ada beberapa poin yang kurang tepat/kurang relevan** karena project ini **Vite + React Router (SPA)**, bukan Next.js.

## Validasi & Koreksi Temuan Utama
### 1) App.tsx: “No code splitting, all pages bundled” — VALID
- Saat ini semua page di-import statically ([App.tsx:L6-L27](file:///c:/Users/prada/Documents/Spark%20studio/src/App.tsx#L6-L27)), sehingga bundler cenderung memasukkan banyak page ke initial chunk.
- Untuk Vite, solusi yang tepat adalah `React.lazy(() => import(...))` untuk page yang jarang dipakai (admin pages, dll) + `<Suspense>` di route.

### 2) StageManager.tsx: “20 sequential queries” — PARTIALLY VALID
- Benar bahwa ada **2 query count per stage** (`totalScans` lalu `todayScans`) dan itu tidak scalable ([StageManager.tsx:L58-L79](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/admin/StageManager.tsx#L58-L79)).
- Namun di dalam `map`, stage diproses via `Promise.all(...)` sehingga antar-stage paralel; yang sequential itu **di dalam per-stage**. Tetap berat: 2N request.
- Root-fix production: ganti ke **query agregasi** (1–2 request total) via RPC/view/SQL yang mengembalikan `stage_id,total_scans,today_scans`.

### 3) useTicketCount.ts: “Waterfall sequential fetches” — VALID & bisa dihapus total
- Hook ini lookup `public.users` berdasarkan email lalu count purchased_tickets ([useTicketCount.ts:L23-L46](file:///c:/Users/prada/Documents/Spark%20studio/src/hooks/useTicketCount.ts#L23-L46)).
- Ini bisa disederhanakan: cukup pakai `user.id` dari auth (sudah ada) → count langsung ke `purchased_tickets.user_id`. Jadi 1 query.
- Realtime subscription saat ini tidak ter-filter (semua event purchased_tickets trigger fetch) ([useTicketCount.ts:L64-L69](file:///c:/Users/prada/Documents/Spark%20studio/src/hooks/useTicketCount.ts#L64-L69)); perlu filter by `user_id` agar tidak spam.

### 4) useDarkMode.ts: localStorage safety + toggle stale closure — VALID
- Saat ini `localStorage.getItem/setItem` tanpa try/catch ([useDarkMode.ts:L4-L23](file:///c:/Users/prada/Documents/Spark%20studio/src/hooks/useDarkMode.ts#L4-L23)).
- `toggleDarkMode = () => setIsDark(!isDark)` berpotensi stale jika dipanggil cepat/beruntun ([useDarkMode.ts:L25](file:///c:/Users/prada/Documents/Spark%20studio/src/hooks/useDarkMode.ts#L25)).
- Solusi: try/catch + functional update `setIsDark(prev => !prev)` + optional version key `theme:v1`.

### 5) “AuthContext creates new function every render” — SALAH LOKASI
- `toggleDarkMode` bukan di AuthContext; ada di `useDarkMode.ts` ([useDarkMode.ts:L25](file:///c:/Users/prada/Documents/Spark%20studio/src/hooks/useDarkMode.ts#L25)).
- AuthContext sendiri bisa dioptimasi (useMemo untuk value), tapi itu topik berbeda.

### 6) “No optimizePackageImports / barrel import config” — KURANG RELEVAN
- `optimizePackageImports` itu fitur Next.js. Di Vite, opsi yang lebih relevan:
  - Hindari barrel import pada library tertentu dengan direct import bila terbukti berat.
  - Gunakan code splitting (React.lazy) sebagai win terbesar untuk project ini.

### 7) QR Code generated every render + dependency eksternal — VALID, plus reliability issue
- StageManager generate URL ke `api.qrserver.com` per render ([StageManager.tsx:L143-L147](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/admin/StageManager.tsx#L143-L147)).
- Jika endpoint eksternal 404/unstable, fitur download/preview QR jadi rapuh.
- Karena project sudah punya dependency `qrcode`, opsi production-grade: generate QR **lokal** (data URL) dan cache/memoize.

## Rencana Implementasi (Setelah Anda Exit Plan Mode)
### P0 (langsung berdampak & minim risiko)
1) **useTicketCount.ts**: hilangkan lookup `users` dan count langsung pakai `user.id`; filter realtime subscription by user_id.
2) **useDarkMode.ts**: tambah try/catch untuk localStorage + functional update toggle + (opsional) key versioning.
3) **App.tsx**: lazy-load admin pages dan page berat (StageManager/Analytics/BulkQR, dll) + Suspense fallback.

### P1 (scalable analytics, root fix)
4) **StageManager.tsx**: ubah arsitektur query dari 2N count queries menjadi agregasi:
   - Opsi A: Supabase RPC `get_stage_scan_stats()` returning `stage_id,total_scans,today_scans`.
   - Opsi B: View/materialized view.
   - Lalu StageManager hanya merge hasil ke list stage.

### P2 (UX/perf polish)
5) Memoize `filteredStages` dan `activeStagesCount` (useMemo).
6) QR: generate QR data URL lokal, cache per stage, dan gunakan untuk preview + download.

## Verifikasi
- Jalankan `npm run lint` dan `npm run build`.
- Uji manual: cold load `/` dan `/admin/*` untuk memastikan Suspense fallback benar dan tidak ada blank.
- Uji StageManager: pastikan counts konsisten dan realtime update tidak spam.

Jika Anda konfirmasi, saya akan mulai dari P0 lalu lanjut P1 sesuai opsi (RPC vs view) yang paling cocok untuk workflow Supabase Anda sekarang.