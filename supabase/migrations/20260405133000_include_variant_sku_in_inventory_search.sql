create or replace function public.list_inventory_product_page(
  p_search_query text default '',
  p_category_slug text default '',
  p_stock_filter text default '',
  p_page integer default 1,
  p_page_size integer default 24
)
returns table(
  product_id bigint,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with filtered_products as (
    select
      p.id,
      p.name,
      coalesce(
        sum(
          case
            when pv.is_active = false then 0
            else greatest(coalesce(pv.stock, 0) - coalesce(pv.reserved_stock, 0), 0)
          end
        ),
        0
      ) as available_stock
    from public.products p
    left join public.categories c
      on c.id = p.category_id
    left join public.product_variants pv
      on pv.product_id = p.id
    where p.deleted_at is null
      and (
        coalesce(p_search_query, '') = ''
        or p.name ilike '%' || p_search_query || '%'
        or p.sku ilike '%' || p_search_query || '%'
        or exists (
          select 1
          from public.product_variants pv_search
          where pv_search.product_id = p.id
            and pv_search.is_active = true
            and pv_search.sku ilike '%' || p_search_query || '%'
        )
      )
      and (
        coalesce(p_category_slug, '') = ''
        or c.slug = p_category_slug
      )
    group by p.id, p.name
  ),
  stock_filtered_products as (
    select
      id,
      name
    from filtered_products
    where coalesce(p_stock_filter, '') not in ('in', 'low', 'out')
      or (p_stock_filter = 'in' and available_stock > 0)
      or (p_stock_filter = 'low' and available_stock > 0 and available_stock <= 10)
      or (p_stock_filter = 'out' and available_stock <= 0)
  )
  select
    id as product_id,
    count(*) over () as total_count
  from stock_filtered_products
  order by name asc, id asc
  limit greatest(coalesce(p_page_size, 24), 1)
  offset (greatest(coalesce(p_page, 1), 1) - 1) * greatest(coalesce(p_page_size, 24), 1);
$$;
