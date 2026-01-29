## React Best Practices (Selalu Dipakai)

Untuk semua perubahan yang menyentuh React/Next.js (komponen, hooks, data fetching, rendering, bundling, dan performa JavaScript):

- Jadikan [AGENTS.md](file:///c:/Users/prada/Documents/Spark%20studio/react-best-practices/AGENTS.md) sebagai sumber aturan utama dan ikuti rekomendasinya secara konsisten.
- Jika butuh detail implementasi, rujuk aturan per-topik di folder [react-best-practices/rules](file:///c:/Users/prada/Documents/Spark%20studio/react-best-practices/rules).
- Saat ada konflik, utamakan aturan yang lebih spesifik untuk konteks perubahan, lalu yang impact-nya lebih tinggi (CRITICAL/HIGH > MEDIUM > LOW).
- Selalu optimalkan untuk: menghilangkan waterfall async, mengecilkan bundle, mengurangi re-render, dan memperbaiki performa rendering tanpa mengorbankan correctness.
- Jika ada trade-off (mis. kompleksitas vs performa), ambil pilihan yang selaras dengan aturan di AGENTS.md dan jelaskan singkat alasannya di hasil akhir.

## Documentation Policy (CRITICAL - Save Tokens!)

### JANGAN Buat File Markdown Kecuali:
- User **explicitly meminta** dokumentasi tertulis
- Major feature yang butuh **long-term reference** (migration, architecture)
- Critical information untuk **rollback/recovery**

### DEFAULT: Berikan Summary di Chat Response
- Ringkas hasil di chat response saja
- Highlight key changes & files modified
- List verification status
- **NO need for separate MD files**

### Jika Harus Buat Dokumentasi:
- **SATU file summary** maksimal (bukan 5-10 files)
- Update existing file instead of creating new
- Keep it concise (< 200 lines)
- Focus on actionable information only

### Rationale:
- Saves ~50% tokens per task
- Reduces noise in workspace
- Keeps focus on actual code
- `.trae/` already gitignored (local only)

## Supabase Development Workflow (WAJIB)

### Sebelum Menyentuh Backend/Database:
1. **ALWAYS use MCP Context7 first** untuk pull latest documentation tentang Supabase best practices
2. Query Context7 dengan topik spesifik: migrations, RLS policies, edge functions, database design, dll
3. Terapkan best practices yang didapat dari dokumentasi terbaru

### Deployment Strategy:
1. **Prioritas 1: MCP Supabase Tools**
   - Gunakan MCP Supabase tools untuk apply migrations
   - Gunakan MCP untuk manage database schema
   - Gunakan MCP untuk deploy edge functions
   
2. **Fallback: Supabase CLI**
   - Jika MCP Supabase tidak tersedia atau gagal
   - Gunakan Supabase CLI sebagai alternatif
   - Pastikan migration history sync sebelum push

### Auto-Deploy Policy:
- **JANGAN tunggu aba-aba untuk deploy**
- Setelah migration file dibuat dan frontend updated, langsung deploy
- Verifikasi deployment success
- Report status di chat response (NO separate MD file)

### Migration Best Practices (dari Context7):
- Gunakan staged approach (add → migrate → verify → drop)
- Hindari DO blocks yang kompleks (Supabase CLI limitation)
- Selalu include rollback plan
- Verify data integrity di setiap phase
- Add proper indexes untuk performance
- Enforce constraints untuk data quality
