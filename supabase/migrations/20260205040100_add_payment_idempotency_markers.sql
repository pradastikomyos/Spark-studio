-- Add idempotency markers for payment side-effects hardening

alter table public.orders
  add column if not exists tickets_issued_at timestamp without time zone,
  add column if not exists capacity_released_at timestamp without time zone;

alter table public.order_products
  add column if not exists stock_released_at timestamp without time zone;
