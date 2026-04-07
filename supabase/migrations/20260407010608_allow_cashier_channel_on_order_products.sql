-- Allow cashier channel in order_products
ALTER TABLE public.order_products
  DROP CONSTRAINT IF EXISTS order_products_channel_check;

ALTER TABLE public.order_products
  ADD CONSTRAINT order_products_channel_check
  CHECK ((channel)::text = ANY (ARRAY['online', 'offline', 'cashier']));
