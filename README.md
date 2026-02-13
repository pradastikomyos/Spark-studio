# Spark Stage

Aplikasi fullstack booking tiket + e-commerce.

- Frontend: Vite + React + TypeScript + Tailwind CSS (deploy: Vercel)
- Backend: Supabase Postgres + Supabase Edge Functions (deploy: Supabase)

## Docs

- Index: `docs/README.md`
- Backend overview + checklist: `docs/backend.md`
- DB migrations workflow (repo ↔ DB sync): `docs/db-migrations-workflow.md`
- Midtrans flow (ticket + product): `MIDTRANS_INTEGRATION.md`
- Voucher system: `docs/voucher-system.md`

## Project Structure (current)

```
spark-photo-studio/
├── frontend/                 # Vite app (React)
│   ├── index.html
│   └── src/
├── supabase/                 # migrations + edge functions (Deno)
│   ├── migrations/
│   └── functions/
├── docs/
├── vite.config.ts            # Vite root diarahkan ke ./frontend
├── vercel.json               # Deploy frontend di Vercel
├── package.json
└── .env.example
```

## Getting Started

### Prerequisites

- Node.js 20.19+ installed
- npm, yarn, pnpm, or bun package manager
- Supabase account (for backend services)
- Midtrans account (for payment gateway)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/pradastikomyos/Spark-studio.git
cd Spark-studio
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_client_key
VITE_MIDTRANS_IS_PRODUCTION=false
```

**Important**: Midtrans Server Key must never be exposed to the browser. Set `MIDTRANS_SERVER_KEY` and `MIDTRANS_IS_PRODUCTION` as Supabase Edge Functions secrets.

## Repo Convention

- Jalankan semua script dari root (`package.json` di root).
- Folder `frontend/` adalah Vite root (diatur via `vite.config.ts`), bukan workspace Node terpisah (tidak ada `frontend/package.json`).

## Midtrans Integration

See `MIDTRANS_INTEGRATION.md`.

## Backend (Supabase)

Dokumentasi struktur backend dan checklist deploy ada di `docs/backend.md`.
Workflow sinkronisasi DB ↔ repo (migrations) ada di `docs/db-migrations-workflow.md`.

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Create a production build:

```bash
npm run build
```

### Preview

Preview the production build locally:

```bash
npm run preview
```

## Deployment to Vercel

### Quick Deploy

1. Push your code to GitHub (already done!)

2. Go to [Vercel](https://vercel.com) and sign in with your GitHub account

3. Click "Add New Project" and import your repository: `pradastikomyos/Spark-studio`

4. Configure your project:
   - Framework Preset: Vite (auto-detected)
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)

5. Add Environment Variables in Vercel dashboard (frontend only):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MIDTRANS_CLIENT_KEY`
   - `VITE_MIDTRANS_IS_PRODUCTION`

**Do not** set Midtrans Server Key as a frontend env. Server key hanya diset sebagai secrets untuk Supabase Edge Functions.

6. Click "Deploy"

### Environment Variables Setup

In your Vercel project settings:

1. Go to Settings → Environment Variables
2. Add each variable from your `.env` file
3. Select which environments (Production, Preview, Development)
4. Save changes

**Important**: Never commit your `.env` file to git. Use `.env.example` as a template.

## Deployment to Supabase (Backend)

Backend berjalan di Supabase:

- Database schema/RLS via migrations: `supabase/migrations`
- Logic server-side via Edge Functions (Deno): `supabase/functions`

Secrets yang wajib diset di Supabase (bukan di Vercel):

- `SUPABASE_SERVICE_ROLE_KEY`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_IS_PRODUCTION`

Deploy Edge Functions dapat dilakukan via Supabase CLI (remote deploy).

### Automatic Deployments

Once connected, Vercel will automatically deploy:
- **Production**: Every push to `main` branch
- **Preview**: Every pull request

### Custom Domain

To add a custom domain:
1. Go to Settings → Domains in your Vercel project
2. Add your domain
3. Update your DNS records as instructed

## Pages

Routes utama:

- `/` Home
- `/booking` Booking tiket (Midtrans)
- `/order/success/:orderNumber` Booking success + status sync
- `/shop` Store
- `/cart` Cart
- `/checkout/product` Checkout produk (Midtrans)
- `/order/product/success/:orderNumber` Product order success + status sync
- `/admin` Admin (voucher, inventory, orders, stages)
- Hero header with curated experiences tagline
- Event filtering (All Events, Workshops, Exhibitions, Masterclass)
- Event cards with 5 upcoming events:
  - Fashion Editorial Lighting (Workshop)
  - Beauty & Skin Retouching (Seminar)
  - The Analog Experience (Masterclass)
  - Shadows & Light Gallery (Exhibition)
  - Color Theory in Set Design (Workshop)
- Private session booking card
- Newsletter subscription
- Date badges and category tags
- Register/RSVP buttons

## Component Overview

- **Navbar**: Fixed navigation with dynamic logo, menu links, and dark mode toggle
- **Logo**: Reusable component that switches between light/dark logo variants
- **Hero**: Full-screen hero section with dramatic imagery and CTAs
- **TicketCard**: Reusable card component for displaying session bookings
- **TicketSection**: Grid layout with ticket cards and decorative elements
- **AboutSection**: Two-column layout with studio philosophy and booking benefits
- **FeaturedCollections**: Portfolio showcase with grayscale-to-color hover effects
- **Newsletter**: Email subscription form with elegant styling
- **Footer**: Multi-column footer with branding (dark logo) and social links
- **DarkModeToggle**: Standalone toggle component (optional, integrated in Navbar)

## TypeScript Types

All components are fully typed with TypeScript interfaces defined in `src/types/index.ts`:

- `TicketData`: Ticket card information
- `AboutItem`: About section items
- `CollectionItem`: Featured collection data

## Customization

### Colors

Premium color palette defined in `tailwind.config.js`:

**Light Mode:**
- Primary: `#D32F2F` (Bold Red)
- Primary Dark: `#B71C1C`
- Background: `#FFFFFF`
- Surface: `#F8F8F8`
- Text: `#171717`
- Subtext: `#525252`

**Dark Mode:**
- Background: `#0A0A0A` (Almost Black)
- Surface: `#121212`
- Text: `#EDEDED`
- Subtext: `#A3A3A3`

### Fonts

- Display: Playfair Display (serif) - for headings
- Body: Inter (sans-serif) - for body text

### Dark Mode Hook

The `useDarkMode` hook provides:
- `isDark`: Current theme state
- `toggleDarkMode`: Function to switch themes
- Automatic localStorage persistence
- System preference detection

## Design Philosophy

This design emphasizes:
- **Sophistication**: Premium dark mode with high contrast
- **Elegance**: Refined typography and spacing
- **Interactivity**: Smooth transitions and hover effects
- **Professionalism**: Clean, modern aesthetic for a photography studio

## License

© 2026 Spark Stage. All rights reserved.
