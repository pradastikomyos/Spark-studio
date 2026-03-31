drop policy if exists products_select_public_or_admin on public.products;
create policy products_select_public_or_admin
  on public.products
  for select
  to public
  using (
    ((is_active is true) and (deleted_at is null))
    or public.is_admin()
  );

drop policy if exists product_variants_select_public_or_admin on public.product_variants;
create policy product_variants_select_public_or_admin
  on public.product_variants
  for select
  to public
  using (
    (is_active is true)
    or public.is_admin()
  );
