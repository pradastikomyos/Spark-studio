# Architecture

## System Overview

Spark Stage is a single-repo app with a React frontend and a Supabase backend.

- Frontend runtime lives in `frontend/`
- Database, RLS, RPC, and migrations live in `supabase/migrations/`
- Edge Functions live in `supabase/functions/`
- Shared server-side payment helpers live in `supabase/functions/_shared/`

## Runtime Map

### Frontend

- Entry points:
  - `frontend/index.html`
  - `frontend/src/main.tsx`
  - `frontend/src/App.tsx`
- Shared UI:
  - `frontend/src/components/`
  - `frontend/src/components/admin/`
- Route pages:
  - `frontend/src/pages/`
  - `frontend/src/pages/admin/`
- Domain state and data:
  - `frontend/src/hooks/`
  - `frontend/src/contexts/`
  - `frontend/src/lib/`
- Utilities and types:
  - `frontend/src/utils/`
  - `frontend/src/types/`

### Backend

- Database schema and policies:
  - `supabase/migrations/`
- Edge Functions by domain:
  - payments and sync
  - stock and pickup
  - image upload lifecycle
  - retention and expiry jobs
- Shared helpers:
  - auth and env access
  - Supabase admin client
  - Midtrans integration
  - payment side-effects

## Current Technical Shape

- Build tool: Vite 6
- UI: React 18 + TypeScript
- Styling: Tailwind CSS 4 plus `frontend/src/index.css`
- Routing: React Router DOM 7
- Server-state management: TanStack Query 5
- Backend client: Supabase JS
- Payments: Midtrans
- Localization: i18next

## Domain Areas

- Ticket booking flow:
  - public booking page
  - payment page
  - booking success sync and recovery
- Product commerce flow:
  - shop
  - cart and checkout
  - product order success and pending states
- Admin CMS and operations:
  - banners
  - booking page settings
  - inventory and product orders
  - dressing room and beauty poster tools
  - voucher manager
  - stage operations and analytics

## Risk Zones

### Payments

- Midtrans status changes must stay consistent across webhook, sync, and reconciliation.
- Ticket issuance, capacity release, stock release, and pickup generation must remain idempotent.

### Auth And Session Timing

- Success pages depend on auth readiness and recovery after redirects.
- Changes in `AuthContext` or `useSessionRefresh` can break payment return flows.

### Large App Shell

- `frontend/src/App.tsx` still owns app shell, providers, route definitions, and several redirects.
- It is a valid target for future extraction if route growth continues.

### Database Drift

- Schema changes must end in migration files.
- RLS and RPC changes done outside migrations will create drift quickly.

## Documentation Layout

- Root `README.md`: onboarding and basic setup
- Root `AGENTS.md`: short repo memory for AI-assisted work
- `docs/architecture.md`: current system map
- `docs/runbooks/`: operational procedures and recovery guides
- `docs/decisions/`: stable behavior, constraints, and feature decisions

## Cleanup Decisions Applied

- Historical plan docs were absorbed into active docs.
- Empty and stale audit files were removed.
- Operational docs were moved out of the repo root into `docs/runbooks/`.
