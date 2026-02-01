create or replace function public.reserve_ticket_capacity(
  p_ticket_id bigint,
  p_date date,
  p_time_slot text,
  p_quantity integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    return false;
  end if;

  update public.ticket_availabilities
  set reserved_capacity = reserved_capacity + p_quantity,
      updated_at = now()
  where ticket_id = p_ticket_id
    and date = p_date
    and time_slot is not distinct from p_time_slot
    and (total_capacity - reserved_capacity - sold_capacity) >= p_quantity;

  return found;
end;
$$;

create or replace function public.release_ticket_capacity(
  p_ticket_id bigint,
  p_date date,
  p_time_slot text,
  p_quantity integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    return false;
  end if;

  update public.ticket_availabilities
  set reserved_capacity = greatest(reserved_capacity - p_quantity, 0),
      updated_at = now()
  where ticket_id = p_ticket_id
    and date = p_date
    and time_slot is not distinct from p_time_slot;

  return found;
end;
$$;

create or replace function public.finalize_ticket_capacity(
  p_ticket_id bigint,
  p_date date,
  p_time_slot text,
  p_quantity integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity is null or p_quantity <= 0 then
    return false;
  end if;

  update public.ticket_availabilities
  set reserved_capacity = greatest(reserved_capacity - p_quantity, 0),
      sold_capacity = sold_capacity + p_quantity,
      updated_at = now()
  where ticket_id = p_ticket_id
    and date = p_date
    and time_slot is not distinct from p_time_slot;

  return found;
end;
$$;
