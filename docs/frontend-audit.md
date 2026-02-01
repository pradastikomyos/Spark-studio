# Audit Frontend (Inventaris)

Dokumen ini hanya inventaris struktur frontend yang aktif saat ini (bukan redesign).

## Stack Frontend

- React 18 + TypeScript + Vite
- Routing: react-router-dom (definisi route di [App.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/App.tsx))
- Styling: Tailwind CSS + CSS global ([index.css](file:///c:/Users/prada/Documents/Spark%20studio/src/index.css))
- Data fetching: SWR
- Backend client: Supabase JS
- i18n: i18next ([src/locales](file:///c:/Users/prada/Documents/Spark%20studio/src/locales))

## Lokasi Kode Frontend

- Entry HTML: [index.html](file:///c:/Users/prada/Documents/Spark%20studio/index.html)
- Bootstrap React: [main.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/main.tsx)
- Router & guard: [App.tsx](file:///c:/Users/prada/Documents/Spark%20studio/src/App.tsx)
- Layout & komponen shared: [components](file:///c:/Users/prada/Documents/Spark%20studio/src/components)
- Halaman public: [pages](file:///c:/Users/prada/Documents/Spark%20studio/src/pages)
- Halaman admin: [pages/admin](file:///c:/Users/prada/Documents/Spark%20studio/src/pages/admin)
- Komponen admin: [components/admin](file:///c:/Users/prada/Documents/Spark%20studio/src/components/admin)
- State/Context: [contexts](file:///c:/Users/prada/Documents/Spark%20studio/src/contexts)
- Hooks (SWR): [hooks](file:///c:/Users/prada/Documents/Spark%20studio/src/hooks)
- Utilitas UI & helper: [utils](file:///c:/Users/prada/Documents/Spark%20studio/src/utils)
- Assets publik: [public](file:///c:/Users/prada/Documents/Spark%20studio/public)
- Logo/brand assets: [src/logo](file:///c:/Users/prada/Documents/Spark%20studio/src/logo)

## Peta Route (Front Office + Admin)

Sumber: [AppRoutes](file:///c:/Users/prada/Documents/Spark%20studio/src/App.tsx#L78-L405)

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

- Layout public: [PublicLayout](file:///c:/Users/prada/Documents/Spark%20studio/src/components/PublicLayout.tsx)
- Navbar: [Navbar](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Navbar.tsx)
- Footer: [Footer](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Footer.tsx)
- Hero/landing sections: [Hero](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Hero.tsx), [FeaturedCollections](file:///c:/Users/prada/Documents/Spark%20studio/src/components/FeaturedCollections.tsx), [AboutSection](file:///c:/Users/prada/Documents/Spark%20studio/src/components/AboutSection.tsx), [Newsletter](file:///c:/Users/prada/Documents/Spark%20studio/src/components/Newsletter.tsx)
- Admin layout: [AdminLayout](file:///c:/Users/prada/Documents/Spark%20studio/src/components/AdminLayout.tsx)

## Titik Branding / Copy yang Berpotensi “Kesan Tukang Foto”

Yang biasanya perlu diinventaris saat migrasi ke “Wahana/Experience”:

- Title/meta/OG image di HTML: [index.html](file:///c:/Users/prada/Documents/Spark%20studio/index.html)
- String navigasi & CTA: [id.json](file:///c:/Users/prada/Documents/Spark%20studio/src/locales/id.json), [en.json](file:///c:/Users/prada/Documents/Spark%20studio/src/locales/en.json)
- Nama halaman/section: Home/Hero/OnStage/Shop/Booking/Payment (komponen di [pages](file:///c:/Users/prada/Documents/Spark%20studio/src/pages) dan [components](file:///c:/Users/prada/Documents/Spark%20studio/src/components))
- Logo & aset visual: [src/logo](file:///c:/Users/prada/Documents/Spark%20studio/src/logo), [public/images](file:///c:/Users/prada/Documents/Spark%20studio/public/images)

## Catatan Arsip

- Snapshot frontend aktif sudah diarsipkan ke folder `frontend lama/` untuk referensi.
