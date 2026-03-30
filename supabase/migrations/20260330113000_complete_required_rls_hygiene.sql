begin;

drop policy if exists "Admins can manage banners" on public.banners;
drop policy if exists "Anyone can view active banners" on public.banners;
create policy banners_select_public_or_admin
  on public.banners
  for select
  to public
  using (is_active = true or public.is_admin());
create policy banners_admin_insert
  on public.banners
  for insert
  to authenticated
  with check (public.is_admin());
create policy banners_admin_update
  on public.banners
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy banners_admin_delete
  on public.banners
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists product_reviews_insert on public.product_reviews;
drop policy if exists product_reviews_update on public.product_reviews;
drop policy if exists product_reviews_user_write on public.product_reviews;
create policy product_reviews_insert
  on public.product_reviews
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) or public.is_admin());
create policy product_reviews_update
  on public.product_reviews
  for update
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());
create policy product_reviews_delete
  on public.product_reviews
  for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists ticket_reviews_insert on public.ticket_reviews;
drop policy if exists ticket_reviews_update on public.ticket_reviews;
drop policy if exists ticket_reviews_user_write on public.ticket_reviews;
create policy ticket_reviews_insert
  on public.ticket_reviews
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) or public.is_admin());
create policy ticket_reviews_update
  on public.ticket_reviews
  for update
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());
create policy ticket_reviews_delete
  on public.ticket_reviews
  for delete
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists products_admin_all on public.products;
drop policy if exists products_public_read on public.products;
create policy products_select_public_or_admin
  on public.products
  for select
  to public
  using (
    ((is_active is true) and (deleted_at is null))
    or exists (
      select 1
      from public.user_role_assignments ura
      where ura.user_id = (select auth.uid())
        and lower(ura.role_name) = 'admin'
    )
  );
create policy products_admin_insert
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());
create policy products_admin_update
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy products_admin_delete
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists product_variants_admin_all on public.product_variants;
drop policy if exists product_variants_public_read on public.product_variants;
create policy product_variants_select_public_or_admin
  on public.product_variants
  for select
  to public
  using (
    (is_active is true)
    or exists (
      select 1
      from public.user_role_assignments ura
      where ura.user_id = (select auth.uid())
        and lower(ura.role_name) = 'admin'
    )
  );
create policy product_variants_admin_insert
  on public.product_variants
  for insert
  to authenticated
  with check (public.is_admin());
create policy product_variants_admin_update
  on public.product_variants
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
create policy product_variants_admin_delete
  on public.product_variants
  for delete
  to authenticated
  using (public.is_admin());

commit;
