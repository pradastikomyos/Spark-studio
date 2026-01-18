# Spesifikasi Desain Halaman — Responsive Admin (Desktop-first)

## Global Styles (Admin)
- **Theme**: mengikuti light/dark yang sudah ada.
- **Background**: `bg-background-light` / `dark:bg-background-dark`.
- **Surface**: kartu/section `bg-white` / `dark:bg-[#1a0f0f]` dengan border halus.
- **Typography**: judul tebal (2xl–3xl desktop), turun 1 tingkat di mobile.
- **Spacing tokens (Tailwind)**:
  - Mobile: container padding `px-4`/`py-4`, gap `gap-4`.
  - Desktop: container padding `px-8`/`py-6`, gap `gap-6`/`gap-8`.
- **Buttons**: tinggi min 40–44px untuk tap target mobile; state hover hanya relevan desktop.
- **Truncation rule**: semua flex row yang memuat teks panjang wajib punya `min-w-0`; teks pakai `truncate` atau `line-clamp-*`.

---

## 1) Kerangka Layout Admin (dipakai semua halaman admin)
### Layout
- **Desktop-first**: layout utama **Flex** horizontal (sidebar + main).
- **Desktop (>=md/>=lg)**:
  - Sidebar lebar tetap (mis. `w-72`) dan `shrink-0`.
  - Main `flex-1`.
- **Mobile (<md)**:
  - Sidebar **hidden** dari layout utama.
  - Sidebar muncul sebagai **drawer** (position fixed) dari kiri, dengan overlay gelap.
  - Drawer bisa di-scroll internal (`overflow-y-auto`).

### Meta Information
- Title pattern: `Admin — {Nama Halaman}`
- Description: `Halaman admin untuk mengelola {konteks halaman}.`
- OG: ikut default app (tidak spesifik admin).

### Page Structure
- **Top App Bar / Header** (sticky opsional):
  - Kiri: tombol hamburger (mobile) + judul.
  - Tengah: subjudul (boleh hidden di mobile atau jadi 2 baris).
  - Kanan: header actions (wrap ke baris baru di mobile).
- **Content Area**:
  - Satu scroll container utama: `overflow-y-auto`.
  - Inner container max width `max-w-7xl`.

### Sections & Components
1. **Mobile Drawer Sidebar**
   - Header sidebar: logo/brand.
   - Menu: tombol navigasi.
   - Footer: tombol logout.
   - Interaction:
     - Open: tap hamburger.
     - Close: tap overlay / tombol close / ESC.
2. **Desktop Sidebar**
   - Sama dengan mobile, tanpa overlay.
3. **Header**
   - Judul & subjudul:
     - Judul: `truncate` di satu baris pada mobile; desktop boleh 1 baris.
     - Subjudul: `line-clamp-2` atau wrap.
   - Actions:
     - `flex-wrap` + gap konsisten.
4. **Overflow Handling**
   - Komponen lebar (tabel): bungkus dengan `overflow-x-auto` + `w-full`.
   - Cegah global horizontal scroll: pastikan parent `overflow-x-hidden` hanya jika diperlukan.

---

## 2) Admin Dashboard
### Layout
- Komponen ringkasan dalam grid:
  - Mobile: 1 kolom.
  - Tablet: 2 kolom.
  - Desktop: 3–4 kolom sesuai isi.

### Meta Information
- Title: `Admin — Dashboard`
- Description: ringkasan status dan data admin.

### Page Structure
- Header (global)
- Section ringkasan (cards)
- Section daftar/tabel (jika ada)

### Sections & Components
1. **Summary Cards Grid**
   - Card: judul kecil + angka utama.
   - Teks panjang: `truncate`.
2. **Table/List Container**
   - Pembungkus: `overflow-x-auto`.
   - Sel: gunakan `truncate` untuk kolom panjang.

---

## 3) Tickets Management (Event Registrations)
### Layout
- Area kontrol/aksi di atas konten utama.
- Konten utama berupa tabel/list.

### Meta Information
- Title: `Admin — Tickets`
- Description: manajemen registrasi/event tickets.

### Page Structure
- Header (global)
- Action Bar (wrap di mobile)
- Table/List

### Sections & Components
1. **Action Bar**
   - `flex flex-wrap` agar tombol/input turun baris di mobile.
   - Kontrol panjang (mis. input/search): `w-full` di mobile, `w-auto` di desktop.
2. **Responsive Table/List**
   - Default: tabel dengan wrapper `overflow-x-auto`.
   - Cell padding lebih kecil di mobile.
   - Kolom panjang: `truncate` + max width per kolom.

---

## 4) Store & Inventory
### Layout
- Konten utama berupa grid kartu item.

### Meta Information
- Title: `Admin — Store & Inventory`
- Description: manajemen item, stok, dan inventori.

### Page Structure
- Header (global)
- Section list/grid item

### Sections & Components
1. **Inventory Grid**
   - Mobile: 1 kolom; Desktop: 2–4 kolom.
   - Card:
     - Gambar: container rasio tetap, `overflow-hidden`.
     - Judul: `truncate`.
     - Meta: `line-clamp-2` bila perlu.
2. **Overflow safety**
   - Pastikan elemen badge/angka tidak memaksa card melebar (gunakan `max-w-full` + `truncate`).
