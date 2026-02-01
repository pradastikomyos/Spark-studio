-- ============================================================================
-- LOCKDOWN RLS + PRIVILEGES (CORE TABLES)
-- ============================================================================
-- Purpose:
--   1) Prevent public/anon access to sensitive user data.
--   2) Enforce least-privilege using RLS for authenticated + admin.
-- Notes:
--   - This is a production safety migration. Review carefully before applying.
--   - Service role (Edge Functions) bypasses RLS, so server-side workflows keep working.
-- ============================================================================

-- Helper: admin role check (fixes "search_path mutable" + improves RLS perf)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    where ura.user_id = (select auth.uid())
      and ura.role_name = 'admin'
  );
$$;

-- ============================================================================
-- Public catalog tables (read-only for anon/authenticated)
-- ============================================================================

alter table public.tickets enable row level security;
revoke all on table public.tickets from anon, authenticated;
grant select on table public.tickets to anon, authenticated;

drop policy if exists tickets_public_read on public.tickets;
create policy tickets_public_read
  on public.tickets
  for select
  to anon, authenticated
  using (true);

alter table public.ticket_availabilities enable row level security;
revoke all on table public.ticket_availabilities from anon, authenticated;
grant select on table public.ticket_availabilities to anon, authenticated;

drop policy if exists ticket_availabilities_public_read on public.ticket_availabilities;
create policy ticket_availabilities_public_read
  on public.ticket_availabilities
  for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- Core user tables (private by default)
-- ============================================================================

alter table public.orders enable row level security;
revoke all on table public.orders from anon, authenticated;
grant select on table public.orders to authenticated;

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
  on public.orders
  for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

alter table public.order_items enable row level security;
revoke all on table public.order_items from anon, authenticated;
grant select on table public.order_items to authenticated;

drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = (select auth.uid()) or public.is_admin())
    )
  );

alter table public.purchased_tickets enable row level security;
revoke all on table public.purchased_tickets from anon, authenticated;
grant select, update on table public.purchased_tickets to authenticated;

drop policy if exists purchased_tickets_select_own_or_admin on public.purchased_tickets;
create policy purchased_tickets_select_own_or_admin
  on public.purchased_tickets
  for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists purchased_tickets_update_admin on public.purchased_tickets;
create policy purchased_tickets_update_admin
  on public.purchased_tickets
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- ============================================================================
-- Product images: allow public read, restrict write to admins
-- ============================================================================

alter table public.product_images enable row level security;
revoke all on table public.product_images from anon, authenticated;
grant select on table public.product_images to anon, authenticated;
grant insert, update, delete on table public.product_images to authenticated;

drop policy if exists "Auth insert" on public.product_images;
drop policy if exists "Auth update" on public.product_images;
drop policy if exists "Auth delete" on public.product_images;

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read
  on public.product_images
  for select
  to anon, authenticated
  using (true);

drop policy if exists product_images_admin_write on public.product_images;
create policy product_images_admin_write
  on public.product_images
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
