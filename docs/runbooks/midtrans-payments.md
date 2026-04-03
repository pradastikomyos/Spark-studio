# Midtrans Payments Runbook

## Scope

This runbook covers ticket payments, product payments, webhook handling, manual sync, and reconciliation.

## Main Components

### Frontend

- `frontend/src/pages/PaymentPage.tsx`
- `frontend/src/pages/BookingSuccessPage.tsx`
- `frontend/src/pages/ProductCheckoutPage.tsx`
- `frontend/src/pages/ProductOrderSuccessPage.tsx`
- `frontend/src/pages/ProductOrderPendingPage.tsx`

### Edge Functions

- `supabase/functions/create-midtrans-token/`
- `supabase/functions/create-midtrans-product-token/`
- `supabase/functions/create-cashier-product-order/`
- `supabase/functions/midtrans-webhook/`
- `supabase/functions/sync-midtrans-status/`
- `supabase/functions/sync-midtrans-product-status/`
- `supabase/functions/reconcile-midtrans-payments/`
- shared side-effects in `supabase/functions/_shared/payment-effects.ts`

## End-To-End Flow

### Ticket Orders

1. Frontend requests a Snap token through `create-midtrans-token`.
2. The function creates a pending order and stores Midtrans response data.
3. Snap popup handles payment on the client.
4. `midtrans-webhook` updates DB state when Midtrans sends a notification.
5. `sync-midtrans-status` is available as a fallback when status looks stuck.
6. `reconcile-midtrans-payments` repairs mismatches that slip through.

### Product Orders

1. Frontend validates voucher preview with `validate_voucher` when needed.
2. `create-midtrans-product-token` reserves stock and voucher quota, then creates the order.
3. Webhook or sync finalizes payment state.
4. Paid orders generate pickup data.
5. Failed or expired orders release reserved stock and voucher quota.
6. If webhook or client sync misses a final state after local payment expiry, `reconcile-midtrans-payments` re-queries Midtrans and finalizes the order.

### Cashier Product Orders

1. Frontend calls `create-cashier-product-order` to create a cashier reservation with a QR pickup code.
2. The order is stored as `channel = 'cashier'` and remains unpaid until admin scans the QR.
3. `complete-product-pickup` is the moment that marks the order paid and completed for cashier flow.
4. Expired cashier reservations release reserved stock and voucher quota automatically.
5. Cashier reservation expiry is enforced by `expire-product-orders`, not by Midtrans sync.

## Reliability Rules

- Webhook, sync, and reconciliation must reuse the same side-effects logic.
- Webhook, sync, and reconciliation must route ticket and product status changes through the shared transition processors.
- Ticket issuance, capacity release, pickup generation, and stock release must be idempotent.
- Lower-priority Midtrans states must not overwrite a stronger local terminal state. In practice this means `pending` cannot regress `paid`, and `failed` or `expired` cannot overwrite a settled order.
- Final status in DB is the source of truth for frontend UI.
- Midtrans online payment finality stays webhook-first, with cron-backed reconciliation as the fallback.
- App-owned expiry windows such as cashier QR and pickup QR are enforced by a frequent cron sweep, not a daily batch.

## Current Hardening Status

- Signature verification is normalized for stable comparisons.
- Shared transition processors are used across webhook, sync, and reconciliation finalization paths.
- Reconciliation exists for mismatch repair.
- Idempotency markers are used for ticket issuance and release flows.
- Product voucher quota release is guarded so duplicate failed or expired callbacks do not decrement quota repeatedly.
- Product stock release clamps to remaining reserved stock before releasing, so repeated recovery paths do not over-release.
- Snap-token creators validate app callback URLs before reserving inventory and roll back created rows on token creation failures.
- Success pages use realtime plus polling fallback instead of assuming a single happy path.
- Cashier QR expiry and pickup QR expiry are enforced by `expire-product-orders`.
- Stale online Midtrans orders are re-checked by `reconcile-midtrans-payments`.

## Cron Jobs

- `reconcile-midtrans-payments-every-5-minutes`
  - every 5 minutes
  - re-checks stale online ticket and product orders whose local expiry has passed
- `expire-product-orders-every-5-minutes`
  - every 5 minutes
  - expires unpaid cashier QR reservations and expired pickup QR codes
- `expire-tickets-daily`
  - 00:05 WIB
  - marks past-date tickets as expired in DB
- `ensure-ticket-availability-daily`
  - 00:15 WIB
  - extends ticket availability coverage
- `retention-cleanup-daily`
  - 01:00 WIB
  - prunes webhook logs and stale reservation tables

## Midtrans To App Status Mapping

- `settlement` -> `paid`
- `capture` with accepted fraud status -> `paid`
- `capture` with non-accepted fraud status -> `pending`
- `pending` -> `pending`
- `deny`, `cancel`, `failure` -> `failed`
- `expire`, `expired` -> `expired`
- `refund`, `refunded`, `partial_refund` -> `refunded`

## Quick Checks For "Paid But UI Still Pending"

- Verify Midtrans notification is reaching the webhook endpoint.
- Verify signature calculation is correct for the received payload.
- Check whether the order is already `paid` in the database.
- Check whether ticket issuance or pickup generation is missing.
- Run the sync function if the webhook path looks delayed.
- Check `cron.job` when stale pending orders do not clear after local expiry.

## Cron Audit Query

```sql
select jobname, schedule, command
from cron.job
where jobname in (
  'reconcile-midtrans-payments-every-5-minutes',
  'expire-product-orders-every-5-minutes',
  'expire-tickets-daily',
  'ensure-ticket-availability-daily',
  'retention-cleanup-daily'
)
order by jobname;
```

## Audit Queries

```sql
select o.order_number
from orders o
left join order_items oi on oi.order_id = o.id
left join purchased_tickets pt on pt.order_item_id = oi.id
where o.status = 'paid'
group by o.order_number
having count(pt.id) = 0;

select order_number
from order_products
where payment_status = 'paid' and pickup_code is null;

select op.order_number, pv.id as variant_id, pv.reserved_stock
from order_products op
join order_product_items opi on opi.order_product_id = op.id
join product_variants pv on pv.id = opi.product_variant_id
where op.status in ('expired', 'cancelled') and pv.reserved_stock > 0;
```

## Validation

```bash
npm run test
```

Test coverage includes Midtrans status mapping and payment-related UI behavior.
