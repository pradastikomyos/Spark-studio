-- ============================================
-- Migration: Enforce max 8 product images
-- Date: 2026-02-21
-- Description:
--   Prevent any product from having more than 8 rows in public.product_images.
--   Enforced at DB level via statement trigger (handles multi-row inserts).
-- ============================================

drop trigger if exists trg_enforce_product_images_max_8 on public.product_images;
drop trigger if exists trg_enforce_product_images_max_8_on_update on public.product_images;
drop function if exists public.enforce_product_images_max_8();

create or replace function public.enforce_product_images_max_8()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  violating_product_id bigint;
  violating_count bigint;
begin
  select
    pi.product_id,
    count(*)::bigint
  into
    violating_product_id,
    violating_count
  from public.product_images pi
  where pi.product_id in (select distinct product_id from inserted)
  group by pi.product_id
  having count(*) > 8
  limit 1;

  if violating_product_id is not null then
    raise exception 'Max 8 images per product exceeded (product_id=% count=%)', violating_product_id, violating_count
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create trigger trg_enforce_product_images_max_8
after insert on public.product_images
referencing new table as inserted
for each statement
execute function public.enforce_product_images_max_8();

create trigger trg_enforce_product_images_max_8_on_update
after update on public.product_images
referencing new table as inserted
for each statement
execute function public.enforce_product_images_max_8();
;
