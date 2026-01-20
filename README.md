# Spark Photo Studio - React TypeScript App

A premium photography studio website built with React, TypeScript, Vite, and Tailwind CSS with sophisticated dark mode support.

## Features

- ⚡ Vite for lightning-fast development
- ⚛️ React 18 with TypeScript
- 🎨 Tailwind CSS for styling
- 🌙 **Dark mode toggle with localStorage persistence**
- 🎨 **Dynamic logo switching (light/dark mode)**
- 🛣️ **React Router for multi-page navigation**
- 📱 Fully responsive design
- 🎭 Material Symbols Outlined icons
- 🔤 Custom Google Fonts (Playfair Display & Inter)
- ✨ Premium animations and transitions
- 🎯 Sophisticated color palette for luxury aesthetic
- 💳 Midtrans Snap payment + Supabase Edge Functions

## Dark Mode

The app includes a fully functional dark mode toggle:
- Click the sun/moon icon in the navbar to switch themes
- **Logo automatically switches** between light and dark versions
- Theme preference is saved to localStorage
- Defaults to dark mode for premium aesthetic
- Smooth transitions between themes
- All components are optimized for both light and dark modes

## Logo System

The app uses dynamic logo switching:
- **Light Mode**: `src/logo/Light mode/light mode.png`
- **Dark Mode**: `src/logo/dark mode/dark mode.png`
- Logo component automatically switches based on theme
- Optimized for retina displays
- Smooth transitions between logo variants

## Project Structure

```
spark-photo-studio/
├── src/
│   ├── components/
│   │   ├── Navbar.tsx (with dark mode toggle & dynamic logo)
│   │   ├── Hero.tsx
│   │   ├── TicketCard.tsx
│   │   ├── TicketSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── FeaturedCollections.tsx
│   │   ├── Newsletter.tsx
│   │   ├── Footer.tsx
│   │   ├── Logo.tsx (reusable logo component)
│   │   └── DarkModeToggle.tsx
│   ├── pages/
│   │   ├── Home.tsx (homepage)
│   │   ├── OnStage.tsx (gallery page)
│   │   ├── Shop.tsx (e-commerce page)
│   │   └── Events.tsx (workshops & events page)
│   ├── hooks/
│   │   └── useDarkMode.ts
│   ├── logo/
│   │   ├── Light mode/
│   │   │   └── light mode.png
│   │   └── dark mode/
│   │       └── dark mode.png
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx (router setup)
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts (type declarations for images)
├── index.html
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
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

Or with your preferred package manager:

```bash
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables:

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_client_key
VITE_MIDTRANS_IS_PRODUCTION=false
```

**Important**: Midtrans Server Key must never be exposed to the browser. Set `MIDTRANS_SERVER_KEY` and `MIDTRANS_IS_PRODUCTION` as Supabase Edge Functions secrets.

## Midtrans Integration

See [MIDTRANS_INTEGRATION.md](file:///c:/Users/prada/Documents/Spark%20studio/MIDTRANS_INTEGRATION.md).

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

5. Add Environment Variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_MIDTRANS_SERVER_KEY`
   - `VITE_MIDTRANS_CLIENT_KEY`
   - `VITE_MIDTRANS_IS_PRODUCTION`

6. Click "Deploy"

### Environment Variables Setup

In your Vercel project settings:

1. Go to Settings → Environment Variables
2. Add each variable from your `.env` file
3. Select which environments (Production, Preview, Development)
4. Save changes

**Important**: Never commit your `.env` file to git. Use `.env.example` as a template.

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

### Home (`/`)
- Hero section with full-screen imagery
- Ticket booking section with date cards
- About section with studio philosophy
- Featured collections (Fashion & Beauty)
- Newsletter subscription

### On Stage (`/on-stage`)
- Gallery header with description
- Interactive grid layout with 6 different studio sets
- Features section (Lighting, Dressing, Props)
- Hover effects with grayscale-to-color transitions
- Responsive masonry-style grid

### Shop (`/shop`)
- Hero header with collection title
- Product filtering by category
- Product grid with 6 items
- Add to cart hover buttons
- Feature section with brand story
- Newsletter subscription

### Events (`/events`)
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

© 2026 Spark Photo Studio. All rights reserved.
