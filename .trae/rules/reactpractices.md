## React Best Practices (Selalu Dipakai)

Untuk semua perubahan yang menyentuh React/Next.js (komponen, hooks, data fetching, rendering, bundling, dan performa JavaScript):

- Jadikan [AGENTS.md](file:///c:/Users/prada/Documents/Spark%20studio/react-best-practices/AGENTS.md) sebagai sumber aturan utama dan ikuti rekomendasinya secara konsisten.
- Jika butuh detail implementasi, rujuk aturan per-topik di folder [react-best-practices/rules](file:///c:/Users/prada/Documents/Spark%20studio/react-best-practices/rules).
- Saat ada konflik, utamakan aturan yang lebih spesifik untuk konteks perubahan, lalu yang impact-nya lebih tinggi (CRITICAL/HIGH > MEDIUM > LOW).
- Selalu optimalkan untuk: menghilangkan waterfall async, mengecilkan bundle, mengurangi re-render, dan memperbaiki performa rendering tanpa mengorbankan correctness.
- Jika ada trade-off (mis. kompleksitas vs performa), ambil pilihan yang selaras dengan aturan di AGENTS.md dan jelaskan singkat alasannya di hasil akhir.
