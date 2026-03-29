# Skeleton Loading Runbook

## Scope

This runbook covers loading-state reliability for:

- auth gate and protected routes
- `BookingSuccessPage`
- `ProductOrderSuccessPage`

It replaces the older baseline, troubleshooting, and remediation-plan docs.

## Current Outcome

Core hardening is already in place. The main purpose of this doc is to preserve the working defaults, recovery path, and verification checklist.

## Runtime Defaults

- default query timeout: 10s
- auth request timeout: 5s
- session fetch timeout on success pages: 8s
- function invoke timeout: 12s
- max skeleton duration: 20s
- booking success auto-sync delays: 0s, 5s, 15s, 35s
- product order success auto-sync delays: 0s, 5s, 15s, 35s, 60s, 90s, 120s

## Expected State Machine

Each critical page should always terminate loading into one of:

- success
- empty
- error
- timeout with retry CTA

Infinite loading without an exit path is a bug.

## Quick Checks

- Check console logs for booking success, product success, and auth transition logs.
- Check whether the session is initialized before page-specific fetches start.
- Check local counters:
  - `manual_refresh_click_count`
  - `auto_sync_success_count`
  - `loading_timeout_count`
- Verify order records and related ticket or product records in Supabase.

## Manual Recovery

- Use `Retry Loading` on success pages when timeout state appears.
- Use `Check Status` or the equivalent manual sync action if payment status is still pending in the UI.

## Baseline Snapshot

Recorded baseline from 2026-02-09:

- scenario: Slow 3G throttle after Midtrans redirect
- expected: skeleton exits within 20 seconds
- observed: skeleton exited at 20 seconds
- manual refresh required: no

## If Issue Reappears

1. Capture console logs.
2. Capture the network trace around auth and sync requests.
3. Record the scenario, expected result, actual result, and exit time.
4. Check whether a timeout wrapper is missing from any critical call.
5. Check whether auth callbacks are doing heavy async work inline.

## Known Remaining Gap

- Automated test execution for some jsdom and ESM scenarios was previously environment-blocked.
- If this area is touched again, prioritize rerunning and stabilizing that test coverage.
