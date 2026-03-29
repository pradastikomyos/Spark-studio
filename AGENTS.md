# Spark Stage Repo Memory

## Purpose

Spark Stage is a fullstack booking ticket and commerce app.

- Frontend: Vite + React + TypeScript in `frontend/`
- Backend: Supabase Postgres + Edge Functions in `supabase/`
- Payments: Midtrans for tickets and product orders

## Repo Map

- `frontend/src/pages/`: route-level pages
- `frontend/src/components/`: shared UI and admin UI
- `frontend/src/hooks/`: data-fetching and domain hooks
- `frontend/src/lib/`: Supabase, query client, shared helpers
- `supabase/migrations/`: database schema, RPC, RLS
- `supabase/functions/`: server-side workflows and payment handlers
- `supabase/functions/_shared/`: shared payment and infra helpers
- `docs/architecture.md`: current architecture and risk zones
- `docs/runbooks/`: operational runbooks
- `docs/decisions/`: stable feature decisions and constraints

## Source Of Truth

- App structure and module map: `docs/architecture.md`
- DB change workflow: `docs/runbooks/db-migrations.md`
- Midtrans payment flow: `docs/runbooks/midtrans-payments.md`
- Voucher behavior: `docs/decisions/voucher-system.md`
- ImageKit migration status: `docs/runbooks/imagekit-migration.md`
- Product admin data-entry rules: `docs/runbooks/admin-product-entry.md`

## Core Commands

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run supabase:db:push
npm run supabase:functions:serve
```

## Guardrails

- Run all commands from the repo root.
- Treat `supabase/migrations/` as the database source of truth.
- Do not change production schema or RLS manually without a migration file.
- Keep payment side-effects idempotent across webhook, sync, and reconciliation flows.
- Keep docs compact. Update an existing doc before adding a new one.

## Risk Zones

- Ticket payment flow: `create-midtrans-token`, `midtrans-webhook`, `sync-midtrans-status`
- Product payment flow: `create-midtrans-product-token`, `sync-midtrans-product-status`
- Shared payment logic: `supabase/functions/_shared/payment-effects.ts`
- Session and auth timing: `frontend/src/contexts/AuthContext.tsx`, `frontend/src/hooks/useSessionRefresh.ts`
- Large route map: `frontend/src/App.tsx`

## Working Rules

- Prefer TanStack Query patterns already used in the app.
- Put long-lived decisions in `docs/decisions/`.
- Put operational or recovery steps in `docs/runbooks/`.
- Delete stale planning docs after their final state is absorbed into active docs.
