# MVP Audit (UI/Route Gaps)

Dokumen ini merangkum audit cepat untuk menemukan: (1) halaman/route yang ada, (2) tombol/CTA yang masih placeholder/desain kosong, dan (3) halaman minimum yang kemungkinan terlewat saat fase desain.

## Identifikasi Proyek

- Frontend: React + TypeScript (Vite)
- Styling: Tailwind CSS
- Routing: `react-router-dom`
- Backend/DB: Supabase (beberapa fitur admin sudah memakainya)
- QR Scan: `html5-qrcode`

## Daftar Route Aktif

Sumber: [App.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/App.tsx)

### Auth

- `/login`
- `/signup`

### Checkout (standalone)

- `/checkout`

### Admin (Protected)

- `/admin/dashboard`
- `/admin/tickets`
- `/admin/store`

### Public (di wrapper Navbar + Footer)

- `/`
- `/on-stage`
- `/shop`
- `/events`
- `/booking`
- `/payment`
- `/booking-success`
- `/cart`
- `/my-tickets`

## Tombol/CTA Yang Masih Placeholder / Minim

### Global layout

- Navbar: link `Spark Club` ke `#` ([Navbar.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Navbar.tsx))
- Navbar: tombol Search terlihat aktif tapi tidak ada aksi ([Navbar.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Navbar.tsx))
- Footer: banyak link masih `href="#"` ([Footer.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Footer.tsx))

### Home

- Hero: CTA `Explore Gallery` masih `href="#"` ([Hero.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Hero.tsx))
- About: tombol `Check Availability` belum ada handler ([AboutSection.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/components/AboutSection.tsx))
- Newsletter: submit hanya `console.log` (belum integrasi) ([Newsletter.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Newsletter.tsx))
- Featured Collections: kartu tampak clickable, tapi tidak ada navigasi/aksi ([FeaturedCollections.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/components/FeaturedCollections.tsx))

### OnStage

- `View Amenities` masih `href="#"` ([OnStage.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/OnStage.tsx))

### Shop

- Tombol add-to-cart belum ada handler ([Shop.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/Shop.tsx))
- `Load More Products` belum ada handler ([Shop.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/Shop.tsx))
- Newsletter bawah belum ada `onSubmit` (berpotensi submit default/reload) ([Shop.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/Shop.tsx))
- `Read Our Story` masih `href="#"` ([Shop.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/Shop.tsx))

### Events

- Tombol `Register/RSVP` belum ada handler ([Events.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/Events.tsx))
- Newsletter belum ada `onSubmit` (berpotensi reload) ([Events.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/Events.tsx))
- `Contact Us` masih `href="#"` ([Events.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/Events.tsx))

### Booking/Payment/Success

- Booking: tombol ganti bulan (chevron) belum ada handler ([BookingPage.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/BookingPage.tsx))
- Payment: proses pembayaran masih simulasi; header nav `Gallery/Bookings/Contact` belum ada handler ([PaymentPage.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/PaymentPage.tsx))
- Booking Success: aksi Email/Download/Save masih `alert` (placeholder) ([BookingSuccessPage.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/BookingSuccessPage.tsx))

### Cart/Checkout

- Cart: promo code hanya `alert` (placeholder) ([CartPage.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/CartPage.tsx))
- Checkout: item order masih hard-coded (belum baca cart) ([CheckoutPage.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/CheckoutPage.tsx))

### Admin

- Menu admin: beberapa item tidak punya `path` (klik hanya menyorot menu tanpa navigasi) ([adminMenu.ts](file:///c:/Users/prada/Documents/Spark%20studio/src/constants/adminMenu.ts), [AdminLayout.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/components/AdminLayout.tsx))
- Dashboard: `Add New Stage`, `Export Data`, `View All`, pagination belum ada handler ([Dashboard.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/admin/Dashboard.tsx))
- Tickets: `Export CSV`, menu `more_vert`, pagination belum ada handler ([TicketsManagement.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/admin/TicketsManagement.tsx))
- Store: `Stock Report`, `Add Product`, `Add Your First Product` belum ada handler; verifikasi masih `alert` ([StoreInventory.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/admin/StoreInventory.tsx))

## Halaman Minimum Yang Kemungkinan Terlewat (untuk MVP)

Daftar ini diambil dari CTA/link yang sudah ada tapi belum punya tujuan (mis. `href="#"`), atau dari menu admin yang belum punya route.

- **NotFound / 404**: saat ini `path="*"` menampilkan layout + nested routes; path tak dikenal bisa tampil konten kosong. Kandidat halaman penting untuk kualitas MVP.
- **Gallery**: tersirat dari `Explore Gallery` dan nav `Gallery` di Payment.
- **Contact**: tersirat dari CTA `Contact Us` dan nav `Contact` di Payment.
- **Spark Club / Membership**: tersirat dari link `Spark Club` di Navbar.
- **Amenities detail** (opsional): tersirat dari CTA `View Amenities` di OnStage.
- **Story/About detail** (opsional): tersirat dari `Read Our Story` di Shop.
- **Admin: Booking Management**: sudah ada menu, tapi belum ada route.
- **Admin: Content Manager**: sudah ada menu, tapi belum ada route.
- **Admin: Settings**: sudah ada menu, tapi belum ada route.

## Prioritas Perbaikan MVP (disarankan)

1. Tambah halaman NotFound/404 dan rapikan struktur routing untuk path tak dikenal.
2. Hubungkan flow e-commerce minimal: Shop → Cart → Checkout (hapus hard-coded cart/order).
3. Rapikan flow booking minimal: Booking → Payment → Success (hapus simulasi/alert pada jalur utama).
4. Hilangkan dead link paling terlihat (`href="#"`) atau arahkan ke halaman yang benar.

