create table if not exists public.payment_effect_runs (
  id bigserial primary key,
  effect_scope text not null,
  order_ref text not null,
  effect_type text not null,
  effect_key text not null default '',
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  heartbeat_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text,
  metadata jsonb,
  constraint payment_effect_runs_status_check
    check (status in ('in_progress', 'completed', 'failed')),
  constraint payment_effect_runs_unique
    unique (effect_scope, order_ref, effect_type, effect_key)
);

create index if not exists idx_payment_effect_runs_lookup
  on public.payment_effect_runs (effect_scope, order_ref, effect_type, effect_key);

create index if not exists idx_payment_effect_runs_status
  on public.payment_effect_runs (status, heartbeat_at);

create or replace function public.claim_payment_effect_run(
  p_effect_scope text,
  p_order_ref text,
  p_effect_type text,
  p_effect_key text default '',
  p_stale_after_seconds integer default 300
)
returns table (
  claimed boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_stale_before timestamptz := v_now - make_interval(secs => greatest(coalesce(p_stale_after_seconds, 300), 1));
begin
  if coalesce(trim(p_effect_scope), '') = '' or coalesce(trim(p_order_ref), '') = '' or coalesce(trim(p_effect_type), '') = '' then
    raise exception 'missing payment effect run identity';
  end if;

  insert into public.payment_effect_runs (
    effect_scope,
    order_ref,
    effect_type,
    effect_key,
    status,
    started_at,
    heartbeat_at,
    completed_at,
    last_error
  )
  values (
    p_effect_scope,
    p_order_ref,
    p_effect_type,
    coalesce(p_effect_key, ''),
    'in_progress',
    v_now,
    v_now,
    null,
    null
  )
  on conflict (effect_scope, order_ref, effect_type, effect_key)
  do update
    set status = 'in_progress',
        started_at = v_now,
        heartbeat_at = v_now,
        completed_at = null,
        last_error = null
  where public.payment_effect_runs.status = 'failed'
     or (
       public.payment_effect_runs.status = 'in_progress'
       and public.payment_effect_runs.heartbeat_at < v_stale_before
     );

  return query
  select
    payment_effect_runs.status = 'in_progress'
      and payment_effect_runs.started_at = v_now
      and payment_effect_runs.heartbeat_at = v_now as claimed,
    payment_effect_runs.status
  from public.payment_effect_runs
  where payment_effect_runs.effect_scope = p_effect_scope
    and payment_effect_runs.order_ref = p_order_ref
    and payment_effect_runs.effect_type = p_effect_type
    and payment_effect_runs.effect_key = coalesce(p_effect_key, '')
  limit 1;
end;
$$;

create or replace function public.complete_payment_effect_run(
  p_effect_scope text,
  p_order_ref text,
  p_effect_type text,
  p_effect_key text default '',
  p_metadata jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_effect_runs
  set status = 'completed',
      heartbeat_at = now(),
      completed_at = now(),
      last_error = null,
      metadata = coalesce(p_metadata, metadata)
  where effect_scope = p_effect_scope
    and order_ref = p_order_ref
    and effect_type = p_effect_type
    and effect_key = coalesce(p_effect_key, '');

  return found;
end;
$$;

create or replace function public.fail_payment_effect_run(
  p_effect_scope text,
  p_order_ref text,
  p_effect_type text,
  p_effect_key text default '',
  p_error text default null,
  p_metadata jsonb default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_effect_runs
  set status = 'failed',
      heartbeat_at = now(),
      completed_at = null,
      last_error = p_error,
      metadata = coalesce(p_metadata, metadata)
  where effect_scope = p_effect_scope
    and order_ref = p_order_ref
    and effect_type = p_effect_type
    and effect_key = coalesce(p_effect_key, '');

  return found;
end;
$$;

alter table public.payment_effect_runs enable row level security;

revoke all on public.payment_effect_runs from anon, authenticated;
grant select on public.payment_effect_runs to authenticated;
grant all on public.payment_effect_runs to service_role;

drop policy if exists payment_effect_runs_admin_read on public.payment_effect_runs;
create policy payment_effect_runs_admin_read
  on public.payment_effect_runs
  for select
  to authenticated
  using (public.is_admin());

revoke execute on function public.claim_payment_effect_run(text, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.complete_payment_effect_run(text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fail_payment_effect_run(text, text, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.claim_payment_effect_run(text, text, text, text, integer) to service_role;
grant execute on function public.complete_payment_effect_run(text, text, text, text, jsonb) to service_role;
grant execute on function public.fail_payment_effect_run(text, text, text, text, text, jsonb) to service_role;
