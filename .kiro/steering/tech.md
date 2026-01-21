# Tech Stack

## Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 3 with custom color palette
- **Routing**: React Router DOM 7
- **State Management**: React Context API (AuthContext)
- **Icons**: Material Symbols Outlined
- **Fonts**: Playfair Display (display), Inter (body)

## Backend & Services

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Edge Functions**: Supabase Functions (Deno runtime)
- **Payment Gateway**: Midtrans Snap
- **QR Code**: qrcode, react-qr-code, html5-qrcode libraries

## Development Tools

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint 9 with React hooks plugin
- **Testing**: Vitest 4
- **Package Manager**: npm

## Common Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)

# Building
npm run build            # TypeScript compile + Vite build
npm run preview          # Preview production build locally

# Quality
npm run lint             # Run ESLint
npm run test             # Run Vitest tests

# Supabase (if using local development)
supabase start           # Start local Supabase
supabase db reset        # Reset local database
supabase functions serve # Serve edge functions locally
```

## Environment Variables

Required variables (see `.env.example`):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_MIDTRANS_CLIENT_KEY`: Midtrans client key (browser-safe)
- `VITE_MIDTRANS_IS_PRODUCTION`: false for sandbox, true for production

**Security Note**: Never expose `MIDTRANS_SERVER_KEY` to the browser. Set it as a Supabase Edge Function secret only.

## TypeScript Configuration

- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled with unused locals/parameters checks
- JSX: react-jsx
