create or replace function public.save_inventory_product(
  p_name text,
  p_slug text,
  p_sku text,
  p_is_active boolean,
  p_product_id bigint default null,
  p_description text default null,
  p_category_id bigint default null,
  p_variants jsonb default '[]'::jsonb,
  p_new_images jsonb default '[]'::jsonb,
  p_removed_image_urls text[] default array[]::text[],
  p_sync_variants boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_product_id bigint;
  v_created boolean := false;
  v_variant jsonb;
  v_variant_id bigint;
  v_incoming_variant_ids bigint[] := array[]::bigint[];
  v_attributes jsonb;
  v_image jsonb;
  v_next_display_order integer;
  v_new_image_count integer := 0;
  v_removed_images jsonb := '[]'::jsonb;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  if p_product_id is null then
    insert into public.products (
      name,
      slug,
      description,
      category_id,
      sku,
      is_active,
      deleted_at,
      updated_at
    ) values (
      btrim(p_name),
      btrim(p_slug),
      nullif(btrim(coalesce(p_description, '')), ''),
      p_category_id,
      btrim(p_sku),
      coalesce(p_is_active, true),
      null,
      now()
    )
    returning id into v_product_id;
    v_created := true;
  else
    update public.products
    set name = btrim(p_name),
        slug = btrim(p_slug),
        description = nullif(btrim(coalesce(p_description, '')), ''),
        category_id = p_category_id,
        sku = btrim(p_sku),
        is_active = coalesce(p_is_active, true),
        updated_at = now()
    where id = p_product_id
      and deleted_at is null
    returning id into v_product_id;

    if not found then
      raise exception 'product % not found', p_product_id;
    end if;
  end if;

  if coalesce(array_length(p_removed_image_urls, 1), 0) > 0 then
    with removed as (
      delete from public.product_images
      where product_id = v_product_id
        and image_url = any (p_removed_image_urls)
      returning id, image_url, image_provider, provider_file_id, provider_file_path
    )
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'image_url', image_url,
          'image_provider', image_provider,
          'provider_file_id', provider_file_id,
          'provider_file_path', provider_file_path
        )
        order by id
      ),
      '[]'::jsonb
    )
    into v_removed_images
    from removed;
  end if;

  if p_sync_variants then
    for v_variant in select * from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) loop
      if nullif(btrim(coalesce(v_variant->>'id', '')), '') is not null then
        v_incoming_variant_ids := array_append(v_incoming_variant_ids, (v_variant->>'id')::bigint);
      end if;
    end loop;

    if coalesce(array_length(v_incoming_variant_ids, 1), 0) > 0 then
      update public.product_variants
      set is_active = false,
          updated_at = now()
      where product_id = v_product_id
        and is_active = true
        and not (id = any (v_incoming_variant_ids));
    else
      update public.product_variants
      set is_active = false,
          updated_at = now()
      where product_id = v_product_id
        and is_active = true;
    end if;

    for v_variant in select * from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) loop
      v_variant_id := null;
      if nullif(btrim(coalesce(v_variant->>'id', '')), '') is not null then
        v_variant_id := (v_variant->>'id')::bigint;
      end if;

      v_attributes := '{}'::jsonb;
      if nullif(btrim(coalesce(v_variant->>'size', '')), '') is not null then
        v_attributes := v_attributes || jsonb_build_object('size', v_variant->>'size');
      end if;
      if nullif(btrim(coalesce(v_variant->>'color', '')), '') is not null then
        v_attributes := v_attributes || jsonb_build_object('color', v_variant->>'color');
      end if;

      if v_variant_id is null then
        insert into public.product_variants (
          product_id,
          name,
          sku,
          price,
          stock,
          reserved_stock,
          is_active,
          attributes,
          updated_at
        ) values (
          v_product_id,
          btrim(coalesce(v_variant->>'name', '')),
          btrim(coalesce(v_variant->>'sku', '')),
          nullif(btrim(coalesce(v_variant->>'price', '')), '')::numeric,
          coalesce(nullif(btrim(coalesce(v_variant->>'stock', '')), '')::integer, 0),
          0,
          true,
          case when v_attributes = '{}'::jsonb then null else v_attributes end,
          now()
        );
      else
        update public.product_variants
        set name = btrim(coalesce(v_variant->>'name', '')),
            sku = btrim(coalesce(v_variant->>'sku', '')),
            price = nullif(btrim(coalesce(v_variant->>'price', '')), '')::numeric,
            stock = coalesce(nullif(btrim(coalesce(v_variant->>'stock', '')), '')::integer, 0),
            is_active = true,
            attributes = case when v_attributes = '{}'::jsonb then null else v_attributes end,
            updated_at = now()
        where id = v_variant_id
          and product_id = v_product_id;

        if not found then
          raise exception 'variant % not found for product %', v_variant_id, v_product_id;
        end if;
      end if;
    end loop;
  end if;

  v_next_display_order := coalesce(
    (
      select max(display_order)
      from public.product_images
      where product_id = v_product_id
    ),
    -1
  ) + 1;

  for v_image in select * from jsonb_array_elements(coalesce(p_new_images, '[]'::jsonb)) loop
    insert into public.product_images (
      product_id,
      image_url,
      image_provider,
      provider_file_id,
      provider_file_path,
      provider_original_url,
      migrated_at,
      display_order,
      is_primary,
      updated_at
    ) values (
      v_product_id,
      v_image->>'image_url',
      coalesce(nullif(v_image->>'image_provider', ''), 'imagekit'),
      nullif(v_image->>'provider_file_id', ''),
      nullif(v_image->>'provider_file_path', ''),
      nullif(v_image->>'provider_original_url', ''),
      case when coalesce(v_image->>'image_provider', 'imagekit') = 'imagekit' then now() else null end,
      v_next_display_order,
      v_next_display_order = 0,
      now()
    );

    v_new_image_count := v_new_image_count + 1;
    v_next_display_order := v_next_display_order + 1;
  end loop;

  with ordered_images as (
    select
      id,
      row_number() over (order by display_order, id) - 1 as next_display_order
    from public.product_images
    where product_id = v_product_id
  )
  update public.product_images pi
  set display_order = ordered_images.next_display_order,
      is_primary = ordered_images.next_display_order = 0,
      updated_at = now()
  from ordered_images
  where pi.id = ordered_images.id;

  return jsonb_build_object(
    'product_id', v_product_id,
    'created', v_created,
    'new_image_count', v_new_image_count,
    'removed_images', v_removed_images,
    'variant_count', (
      select count(*)
      from public.product_variants
      where product_id = v_product_id and is_active = true
    ),
    'image_count', (
      select count(*)
      from public.product_images
      where product_id = v_product_id
    )
  );
end;
$function$;

revoke all on function public.save_inventory_product(
  text,
  text,
  text,
  boolean,
  bigint,
  text,
  bigint,
  jsonb,
  jsonb,
  text[],
  boolean
) from public, anon, authenticated;

grant execute on function public.save_inventory_product(
  text,
  text,
  text,
  boolean,
  bigint,
  text,
  bigint,
  jsonb,
  jsonb,
  text[],
  boolean
) to service_role;

create or replace function public.delete_inventory_product(
  p_product_id bigint,
  p_deleted_at timestamp with time zone default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_deleted_at timestamp without time zone := timezone('UTC', coalesce(p_deleted_at, now()));
  v_product_exists boolean := false;
  v_deleted_images jsonb := '[]'::jsonb;
begin
  if not (public.is_admin() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  select exists(
    select 1
    from public.products
    where id = p_product_id
  )
  into v_product_exists;

  if not v_product_exists then
    raise exception 'product % not found', p_product_id;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'image_url', image_url,
        'image_provider', image_provider,
        'provider_file_id', provider_file_id,
        'provider_file_path', provider_file_path
      )
      order by display_order, id
    ),
    '[]'::jsonb
  )
  into v_deleted_images
  from public.product_images
  where product_id = p_product_id;

  perform public.soft_delete_product_cascade(p_product_id, v_deleted_at);

  delete from public.product_images
  where product_id = p_product_id;

  return jsonb_build_object(
    'product_id', p_product_id,
    'deleted_images', v_deleted_images
  );
end;
$function$;

revoke all on function public.delete_inventory_product(bigint, timestamp with time zone) from public, anon, authenticated;
grant execute on function public.delete_inventory_product(bigint, timestamp with time zone) to service_role;
