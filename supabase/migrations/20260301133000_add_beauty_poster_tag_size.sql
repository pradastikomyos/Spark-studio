alter table public.beauty_poster_tags
add column if not exists size_pct double precision not null default 6;
