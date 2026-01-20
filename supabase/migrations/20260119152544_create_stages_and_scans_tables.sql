create table if not exists public.stages (
  id serial primary key,
  code varchar not null unique,
  name varchar not null,
  description text,
  zone varchar,
  max_occupancy integer default 5,
  status varchar default 'active' check (status::text = any ((array['active'::character varying, 'maintenance'::character varying, 'inactive'::character varying])::text[])),
  qr_code_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.stage_scans (
  id serial primary key,
  stage_id integer not null references public.stages(id) on delete cascade,
  purchased_ticket_id integer references public.purchased_tickets(id) on delete set null,
  scanned_at timestamptz default now(),
  user_agent text,
  ip_address inet
);

create index if not exists idx_stage_scans_stage_id on public.stage_scans using btree (stage_id);
create index if not exists idx_stage_scans_scanned_at on public.stage_scans using btree (scanned_at);
create index if not exists idx_stage_scans_stage_date on public.stage_scans using btree (stage_id, scanned_at);

