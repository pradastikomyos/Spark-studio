alter table if exists public.order_products
  add column if not exists pickup_code varchar(20),
  add column if not exists pickup_status varchar(20) not null default 'pending_pickup',
  add column if not exists picked_up_at timestamptz,
  add column if not exists picked_up_by bigint references public.users(id),
  add column if not exists pickup_expires_at timestamptz;

create unique index if not exists order_products_pickup_code_unique
  on public.order_products (pickup_code)
  where pickup_code is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_products_pickup_status_check'
  ) then
    alter table public.order_products
      add constraint order_products_pickup_status_check
      check (pickup_status in ('pending_pickup','completed','expired','cancelled'));
  end if;
end $$;

create or replace function public.generate_pickup_code()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'PRX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 3)) || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 3));

    if not exists (
      select 1
      from public.order_products
      where pickup_code = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;
