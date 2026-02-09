# Skeleton Loading Baseline Capture

Date: 2026-02-09
Owner: TBD

## Target Pages
- BookingSuccessPage
- ProductOrderSuccessPage
- Auth gate / protected route

## Repro Matrix
- Token valid vs expired
- Network slow/timeout
- Redirect from Midtrans
- Tab hidden -> visible

## Baseline Notes (Fill In)
- Scenario:
- Steps:
- Expected:
- Actual:
- Time to exit skeleton:
- Manual refresh needed (Y/N):
- Console logs (snippet):

## Baseline Result - 2026-02-09
- Scenario: Slow 3G network throttle
- Steps: Complete payment via Midtrans → redirect to success page
- Expected: Skeleton exits within 20s
- Actual: Skeleton exits at exactly 20s ✅
- Time to exit skeleton: 20s
- Manual refresh needed (Y/N): No
- Test date: 2026-02-09

## Baseline Metrics Snapshot (Fill In)
- manual_refresh_click_rate:
- loading_timeout_count:
- sync_success_without_manual_rate:
- auth_401_after_redirect_rate:
- p95 latency query kritis:

## Local Metrics Keys (Browser Storage)
- manual_refresh_click_count
- auto_sync_success_count
- loading_timeout_count
