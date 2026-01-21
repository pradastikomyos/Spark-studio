# Project Structure

## Directory Organization

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── booking/        # Booking flow components
│   └── layout/         # Layout components
├── pages/              # Route-level page components
│   └── admin/          # Admin dashboard pages
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── lib/                # Third-party library configurations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and helpers
├── constants/          # Application constants
└── logo/               # Logo assets (light/dark variants)

supabase/
├── functions/          # Edge Functions (Deno)
└── migrations/         # Database migrations (SQL)
```

## Key Conventions

### Component Structure

- **Pages**: Top-level route components in `src/pages/`
- **Components**: Reusable UI in `src/components/`
- **Layouts**: `PublicLayout` for customer pages, `AdminLayout` for admin pages
- **Protected Routes**: Use `ProtectedRoute` wrapper for authenticated/admin routes

### Naming Conventions

- **Components**: PascalCase (e.g., `TicketCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useDarkMode.ts`)
- **Utils**: camelCase (e.g., `formatters.ts`)
- **Types**: PascalCase interfaces (e.g., `TicketData`)
- **Constants**: camelCase files, UPPER_SNAKE_CASE exports

### Routing Pattern

- Public routes: `/`, `/on-stage`, `/shop`, `/events`
- Auth routes: `/login`, `/signup`
- Protected customer routes: `/booking/:slug`, `/payment`, `/my-tickets`, `/cart`
- Admin routes: `/admin/*` (all require admin role)
- Special routes: `/scan/:stageCode` (QR scanning)

### State Management

- **Global Auth**: `AuthContext` provider wraps entire app
- **Theme**: `useDarkMode` hook with localStorage persistence
- **Local State**: Component-level useState for UI state
- **Server State**: Direct Supabase queries (no additional cache layer)

### Styling Approach

- **Tailwind Utility Classes**: Primary styling method
- **Dark Mode**: `dark:` prefix with class-based mode
- **Custom Colors**: Defined in `tailwind.config.js`
- **Responsive**: Mobile-first with Tailwind breakpoints

### Type Definitions

- **Database Types**: `src/types/database.types.ts` (Supabase generated)
- **App Types**: `src/types/index.ts` (application-specific)
- **Component Props**: Inline interfaces or type aliases

### Supabase Integration

- **Client**: Initialized in `src/lib/supabase.ts`
- **Edge Functions**: Located in `supabase/functions/`
- **Migrations**: SQL files in `supabase/migrations/`
- **Auth**: Managed through Supabase Auth with role-based access

### Asset Management

- **Logos**: Dynamic switching based on theme (`src/logo/`)
- **Images**: Import via Vite's asset handling
- **Icons**: Material Symbols Outlined (web font)
