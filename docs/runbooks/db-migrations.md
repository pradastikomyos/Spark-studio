# DB Migrations Workflow

Source of truth for schema, RPC, and RLS is `supabase/migrations/`.

## Rules

- Do not leave production-only schema changes in the Supabase Dashboard without a matching migration file.
- Every database change must end in a committed migration.
- Use MCP, SQL editor, or CLI for debug and verification, but persist the final result in `supabase/migrations/`.
- Migration filenames must be unique in both timestamp and descriptive suffix.
- Before creating a migration, search the folder for the intended suffix to avoid duplicate names.
- If a migration is superseded or duplicated, keep history intact and add an explicit comment explaining the relationship instead of renaming old files.
- If migration history is repaired remotely, rerun `supabase migration list` until Local and Remote match for the affected timestamps.

## Normal Flow

1. Make the schema, RPC, or RLS change in a safe environment.
2. Generate a migration:
   - `supabase db diff -f <migration_name>`
   - `rg "<migration_name>" supabase/migrations` should return nothing first
3. Review the SQL.
4. Apply it:
   - `supabase db push`
5. Commit the migration together with dependent app changes.

## If Remote Changed First

1. Fetch migration history:
   - `supabase migration fetch`
2. Compare the remote history with local files.
3. Commit the synced migration files.

## Repair History

Use this after `supabase migration repair`, dashboard SQL, or MCP-driven migration fixes.

1. Confirm the repo is linked to the expected project:
   - `supabase status`
2. Run:
   - `supabase migration list`
3. Verify Local and Remote are identical for every repaired timestamp before doing any new deploy.
4. If a timestamp exists remotely but not locally, fetch or restore the matching file in `supabase/migrations/`.
5. If a timestamp exists locally but not remotely, stop and resolve the history mismatch before `supabase db push`.

For the 2026-03-31 pickup and ticket-scan repair, the expected sanity check is:

- `20260331100000`
- `20260331113000`
- `20260331113100`
- `20260331140000`
- `20260331140100`

## Edge Function Deploy After Migration Repair

If a migration changed RPC, RLS, or function-facing database behavior, redeploy the dependent Edge Functions from the local repo so CLI deploy remains the source of truth.

1. Redeploy the function from the repo root:
   - `supabase functions deploy complete-product-pickup`
   - `supabase functions deploy validate-entrance-ticket`
2. If a function intentionally uses manual auth checks, keep `verify_jwt = false` in `supabase/config.toml` so deploy behavior is reproducible without ad hoc flags.
3. Smoke test the dependent frontend flow in the target environment after deploy.

## Before Deploy

- `supabase migration list` has no unexplained mismatch
- `npm run build` passes
- critical RLS and RPC changes have a reviewed migration file
- function config in `supabase/config.toml` matches the intended runtime auth mode

## Notes

- Prefer timestamp-based migration names for stable ordering.
- Do not rewrite production migration history casually.
- If onboarding becomes too slow, consider a new baseline strategy instead of editing old migrations in place.
