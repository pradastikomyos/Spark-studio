# Skeleton Loading Runbook

Date: 2026-02-09
Owner: TBD

## Scope
- BookingSuccessPage
- ProductOrderSuccessPage
- Auth initialization / token refresh chain

## Symptoms
- Skeleton loading persists beyond 20s.
- Manual refresh is required to proceed.
- Auto-sync retries do not recover.

## Quick Checks
- Check console logs for:
  - [BookingSuccess] Sync start / success / error
  - [ProductOrderSuccess] Sync start / success / error
  - [AuthContext] SIGNED_IN / TOKEN_REFRESHED validation timing
  - Loading timeout reached
- Check localStorage counters:
  - manual_refresh_click_count
  - auto_sync_success_count
  - loading_timeout_count
- Verify `order_number` and status in Supabase tables:
  - `orders`, `order_items`, `purchased_tickets`
  - `order_products`, `order_product_items`

## Manual Recovery
- Use "Retry Loading" on the success page.
- Use "Check Status" / "Check Status Manually" if pending.

## If Issue Persists
- Capture console logs and network trace.
- Record repro steps in `docs/skeleton-loading-baseline.md`.
- Verify Edge Function response:
  - `sync-midtrans-status`
  - `sync-midtrans-product-status`

## Escalation
- If repeated 401 after redirect:
  - Check auth initialization timing logs.
  - Confirm refresh token is valid.
- If timeouts persist:
  - Confirm network conditions or increase timeout thresholds temporarily.
