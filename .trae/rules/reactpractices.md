## React Best Practices (Selalu Dipakai)

Untuk semua perubahan yang menyentuh React/Next.js (komponen, hooks, data fetching, rendering, bundling, dan performa JavaScript):

- Jadikan [AGENTS.md](file:///c:/Users/prada/Documents/Spark%20studio/react-best-practices/AGENTS.md) sebagai sumber aturan utama dan ikuti rekomendasinya secara konsisten.
- Jika butuh detail implementasi, rujuk aturan per-topik di folder [react-best-practices/rules](file:///c:/Users/prada/Documents/Spark%20studio/react-best-practices/rules).
- Saat ada konflik, utamakan aturan yang lebih spesifik untuk konteks perubahan, lalu yang impact-nya lebih tinggi (CRITICAL/HIGH > MEDIUM > LOW).
- Selalu optimalkan untuk: menghilangkan waterfall async, mengecilkan bundle, mengurangi re-render, dan memperbaiki performa rendering tanpa mengorbankan correctness.
- Jika ada trade-off (mis. kompleksitas vs performa), ambil pilihan yang selaras dengan aturan di AGENTS.md dan jelaskan singkat alasannya di hasil akhir.

sekedar reminder
untuk konteks sistem ini menggunnakan sistem dufan jadi satu tiket bisa masuk berbagai stage (ruangan photo studio dinamakan stage), jika anda bertanya kenapa di admin aday yang buat analisa stage misal mana yang ramai dan kurang peminat, itu memang sengaja, karena saya nantinya tempel barcode untuk masuk stage, jadi user tetap scan qr (tapi gratis) saat mau masuk, ini cuman buat analisa trafic
perlu diingat ini sistem real yang akan dipakai cleint, harap tidak fix hari ini saja atau tidak bandage patcher, tapi benar benar debug root cause
use mcp sequential thinking to think, mcp supabase to check DB, or supabase cli if needed to check edge function dengan membuka terminal
