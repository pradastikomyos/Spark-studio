begin;

create index if not exists idx_discount_products_product_id
  on public.discount_products (product_id);

create index if not exists idx_dressing_room_look_items_product_variant_id
  on public.dressing_room_look_items (product_variant_id);

create index if not exists idx_order_products_discount_id
  on public.order_products (discount_id);

create index if not exists idx_order_products_shipping_voucher_id
  on public.order_products (shipping_voucher_id);

create index if not exists idx_product_reviews_order_product_id
  on public.product_reviews (order_product_id);

create index if not exists idx_product_reviews_product_variant_id
  on public.product_reviews (product_variant_id);

create index if not exists idx_reservations_ticket_id
  on public.reservations (ticket_id);

create index if not exists idx_shipping_voucher_usage_order_product_id
  on public.shipping_voucher_usage (order_product_id);

create index if not exists idx_shipping_voucher_usage_shipping_voucher_id
  on public.shipping_voucher_usage (shipping_voucher_id);

create index if not exists idx_ticket_reviews_purchased_ticket_id
  on public.ticket_reviews (purchased_ticket_id);

create index if not exists idx_user_id_mapping_new_id
  on public.user_id_mapping (new_id);

drop index if exists public.order_product_items_product_variant_id_index;

drop policy if exists "Admins can manage banners" on public.banners;
create policy "Admins can manage banners"
  on public.banners
  for all
  to public
  using (
    exists (
      select 1
      from public.user_role_assignments
      where user_role_assignments.user_id = (select auth.uid())
        and user_role_assignments.role_name = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_role_assignments
      where user_role_assignments.user_id = (select auth.uid())
        and user_role_assignments.role_name = 'admin'
    )
  );

drop policy if exists order_products_read_own on public.order_products;
create policy order_products_read_own
  on public.order_products
  for select
  to public
  using ((select auth.uid()) = user_id);

drop policy if exists order_product_items_read_own on public.order_product_items;
create policy order_product_items_read_own
  on public.order_product_items
  for select
  to public
  using (
    exists (
      select 1
      from public.order_products op
      where op.id = order_product_items.order_product_id
        and op.user_id = (select auth.uid())
    )
  );

drop policy if exists product_reviews_read on public.product_reviews;

drop policy if exists "Service role has full access" on public.profiles;
create policy "Service role has full access"
  on public.profiles
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to public
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can view their own profile" on public.profiles;

drop policy if exists "Only admins can delete stages" on public.stages;
create policy "Only admins can delete stages"
  on public.stages
  for delete
  to public
  using (
    exists (
      select 1
      from public.user_role_assignments
      where user_role_assignments.user_id = (select auth.uid())
        and user_role_assignments.role_name = any (array['admin', 'super_admin'])
    )
  );

drop policy if exists "Only admins can insert stages" on public.stages;
create policy "Only admins can insert stages"
  on public.stages
  for insert
  to public
  with check (
    exists (
      select 1
      from public.user_role_assignments
      where user_role_assignments.user_id = (select auth.uid())
        and user_role_assignments.role_name = any (array['admin', 'super_admin'])
    )
  );

drop policy if exists "Only admins can update stages" on public.stages;
create policy "Only admins can update stages"
  on public.stages
  for update
  to public
  using (
    exists (
      select 1
      from public.user_role_assignments
      where user_role_assignments.user_id = (select auth.uid())
        and user_role_assignments.role_name = any (array['admin', 'super_admin'])
    )
  )
  with check (
    exists (
      select 1
      from public.user_role_assignments
      where user_role_assignments.user_id = (select auth.uid())
        and user_role_assignments.role_name = any (array['admin', 'super_admin'])
    )
  );

drop policy if exists ticket_reviews_read on public.ticket_reviews;

drop policy if exists "read own roles" on public.user_role_assignments;
create policy "read own roles"
  on public.user_role_assignments
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_role_assignments_select_own on public.user_role_assignments;

drop policy if exists admin_read_webhook_logs on public.webhook_logs;
create policy admin_read_webhook_logs
  on public.webhook_logs
  for select
  to public
  using (
    exists (
      select 1
      from public.user_role_assignments ura
      where ura.user_id = (select auth.uid())
        and lower(ura.role_name) = 'admin'
    )
  );

commit;
