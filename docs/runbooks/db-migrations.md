# DB Migrations Workflow

Source of truth for schema, RPC, and RLS is `supabase/migrations/`.

## Rules

- Do not leave production-only schema changes in the Supabase Dashboard without a matching migration file.
- Every database change must end in a committed migration.
- Use MCP, SQL editor, or CLI for debug and verification, but persist the final result in `supabase/migrations/`.

## Normal Flow

1. Make the schema, RPC, or RLS change in a safe environment.
2. Generate a migration:
   - `supabase db diff -f <migration_name>`
3. Review the SQL.
4. Apply it:
   - `supabase db push`
5. Commit the migration together with dependent app changes.

## If Remote Changed First

1. Fetch migration history:
   - `supabase migration fetch`
2. Compare the remote history with local files.
3. Commit the synced migration files.

## Before Deploy

- `supabase migration list` has no unexplained mismatch
- `npm run build` passes
- critical RLS and RPC changes have a reviewed migration file

## Notes

- Prefer timestamp-based migration names for stable ordering.
- Do not rewrite production migration history casually.
- If onboarding becomes too slow, consider a new baseline strategy instead of editing old migrations in place.
