# Payment Deadlock Review

## Scope

- Supabase project: hogzjapnkvsihvvbgcdb
- Payment flows: Midtrans (ticket + product) and cashier product pickup
- Surfaces: Edge Functions and payment-related RPCs

## Current Findings (2026-04-07)

- Urgent: none
- High: none
- Medium: none
- Nice to have:
  - Document lock order so new flows do not introduce lock inversion.
  - Run lock-wait monitoring during peak payment traffic.

## Locking Observations

- Product order RPCs lock `order_products` first, then `product_variants`, with `product_variant_id` ordered.
- Stock reservation uses single-row updates on `product_variants`.
- Voucher reservation uses `FOR UPDATE` on `vouchers` only.
- Ticket capacity reservation uses `FOR UPDATE` on `ticket_availabilities`.

## Risk Notes

- Deadlock risk rises if a future flow locks `product_variants` and `order_products` in the opposite order within one transaction.
- Keep voucher and stock locks in a consistent order if a combined transaction is ever added.
- Webhook/sync/reconcile calls are autocommit; this reduces multi-lock deadlock risk today.

## Recommended Practices

- Keep lock order consistent in payment RPCs:
  - `order_products` -> `order_product_items` -> `product_variants`
- Order `product_variants` locks by `product_variant_id`.
- Avoid long-running transactions in payment handlers.

## Optional Monitoring Queries

```sql
select
  now() as observed_at,
  a.pid,
  a.state,
  a.wait_event_type,
  a.wait_event,
  l.locktype,
  l.mode,
  l.granted,
  a.query
from pg_locks l
join pg_stat_activity a on a.pid = l.pid
where a.datname = current_database()
  and not l.granted
order by a.pid;

select
  bl.pid as blocked_pid,
  ba.query as blocked_query,
  kl.pid as blocking_pid,
  ka.query as blocking_query
from pg_locks bl
join pg_stat_activity ba on ba.pid = bl.pid
join pg_locks kl on kl.locktype = bl.locktype
  and kl.database is not distinct from bl.database
  and kl.relation is not distinct from bl.relation
  and kl.page is not distinct from bl.page
  and kl.tuple is not distinct from bl.tuple
  and kl.transactionid is not distinct from bl.transactionid
  and kl.classid is not distinct from bl.classid
  and kl.objid is not distinct from bl.objid
  and kl.objsubid is not distinct from bl.objsubid
  and kl.pid != bl.pid
join pg_stat_activity ka on ka.pid = kl.pid
where not bl.granted;
```

## References

- `docs/runbooks/midtrans-payments.md`
- `supabase/migrations/20260404100000_add_cancel_product_order_atomic.sql`
- `supabase/migrations/20260404100100_add_expire_product_order_atomic.sql`
- `supabase/migrations/20260403193000_add_cashier_product_pickup_atomic.sql`
- `supabase/migrations/20260331113000_add_atomic_complete_product_pickup.sql`
- `supabase/migrations/20260209000001_atomic_product_reservation.sql`
- `supabase/migrations/20260213031206_add_voucher_system.sql`
