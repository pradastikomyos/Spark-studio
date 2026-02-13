# Audit Frontend (Inventaris)

Dokumen ini hanya inventaris struktur frontend yang aktif saat ini (bukan redesign).

## Stack Frontend

- React 18 + TypeScript + Vite
- Routing: react-router-dom (definisi route di `frontend/src/App.tsx`)
- Styling: Tailwind CSS + CSS global (`frontend/src/index.css`)
- Data fetching: TanStack React Query
- Backend client: Supabase JS
- i18n: i18next (`frontend/src/locales`)

## Lokasi Kode Frontend

- Entry HTML: `frontend/index.html`
- Bootstrap React: `frontend/src/main.tsx`
- Router & guard: `frontend/src/App.tsx`
- Layout & komponen shared: `frontend/src/components`
- Halaman public: `frontend/src/pages`
- Halaman admin: `frontend/src/pages/admin`
- Komponen admin: `frontend/src/components/admin`
- State/Context: `frontend/src/contexts`
- Hooks: `frontend/src/hooks`
- Utilitas UI & helper: `frontend/src/utils`
- Assets publik: `frontend/public`
- Logo/brand assets: `frontend/src/logo`

## Peta Route (Front Office + Admin)

Sumber: `frontend/src/App.tsx`

- Public (tanpa login)
  - `/` → Home
  - `/on-stage` → OnStage
  - `/events` → Events
  - `/shop` → Shop
  - `/shop/product/:productId` → ProductDetailPage
  - `/cart` → CartPage
  - `/scan/:stageCode` → StageScanPage
  - `*` → NotFound
- Auth
  - `/login` → Login
  - `/signup` → SignUp
- Protected (butuh login)
  - `/booking/:slug` → BookingPage
  - `/payment` → PaymentPage
  - `/booking-success` → BookingSuccessPage
  - `/my-tickets` → MyTicketsPage
  - `/my-orders` → MyProductOrdersPage
  - `/checkout/product` → ProductCheckoutPage
  - `/order/product/success/:orderNumber` → ProductOrderSuccessPage
- Checkout (perhatikan ini tidak dibungkus ProtectedRoute)
  - `/checkout` → CheckoutPage
- Admin (adminOnly)
  - `/admin` → redirect ke `/admin/dashboard`
  - `/admin/dashboard` → Dashboard
  - `/admin/tickets` → TicketsManagement
  - `/admin/store` → StoreInventory
  - `/admin/stages` → StageManager
  - `/admin/stage-analytics` → StageAnalytics
  - `/admin/qr-bulk` → StageBulkQR
  - `/admin/order-ticket` → OrderTicket
  - `/admin/product-orders` → ProductOrders

## Layout Utama (Komponen yang Paling Mengikat Desain)

- Layout public: `frontend/src/components/PublicLayout.tsx`
- Navbar: `frontend/src/components/Navbar.tsx`
- Footer: `frontend/src/components/Footer.tsx`
- Hero/landing sections: `frontend/src/components/Hero.tsx`, `frontend/src/components/FeaturedCollections.tsx`, `frontend/src/components/AboutSection.tsx`, `frontend/src/components/Newsletter.tsx`
- Admin layout: `frontend/src/components/AdminLayout.tsx`

## Titik Branding / Copy yang Berpotensi “Kesan Tukang Foto”

Yang biasanya perlu diinventaris saat migrasi ke “Wahana/Experience”:

- Title/meta/OG image di HTML: `frontend/index.html`
- String navigasi & CTA: `frontend/src/locales/id.json`, `frontend/src/locales/en.json`
- Nama halaman/section: Home/Hero/OnStage/Shop/Booking/Payment (komponen di `frontend/src/pages` dan `frontend/src/components`)
- Logo & aset visual: `frontend/src/logo`, `frontend/public/images`

## Catatan Arsip

- Snapshot frontend aktif sudah diarsipkan ke folder `frontend lama/` untuk referensi.
