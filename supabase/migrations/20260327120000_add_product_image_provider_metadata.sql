alter table public.product_images
  add column if not exists image_provider text not null default 'supabase',
  add column if not exists provider_file_id text,
  add column if not exists provider_file_path text,
  add column if not exists provider_original_url text,
  add column if not exists migrated_at timestamptz;
update public.product_images
set image_provider = case
  when image_url like '%ik.imagekit.io%' then 'imagekit'
  else 'supabase'
end
where image_provider is null
   or image_provider not in ('supabase', 'imagekit');
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_images_image_provider_check'
      and conrelid = 'public.product_images'::regclass
  ) then
    alter table public.product_images
      add constraint product_images_image_provider_check
      check (image_provider in ('supabase', 'imagekit'));
  end if;
end $$;
create index if not exists product_images_provider_idx
  on public.product_images(product_id, image_provider);
create unique index if not exists product_images_provider_file_id_unique
  on public.product_images(provider_file_id)
  where provider_file_id is not null;
