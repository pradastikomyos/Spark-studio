alter table public.purchased_tickets
  add column if not exists queue_number integer,
  add column if not exists queue_overflow boolean not null default false;

create or replace function public.assign_purchased_ticket_queue_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
  session_capacity integer;
begin
  if new.time_slot is null then
    new.queue_number := null;
    new.queue_overflow := false;
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtext(new.ticket_id::text),
    hashtext(new.valid_date::text || ':' || coalesce(new.time_slot::text, 'allday'))
  );

  select coalesce(max(pt.queue_number), 0) + 1
  into next_number
  from public.purchased_tickets pt
  where pt.ticket_id = new.ticket_id
    and pt.valid_date = new.valid_date
    and pt.time_slot is not distinct from new.time_slot
    and pt.queue_number is not null;

  new.queue_number := next_number;

  select ta.total_capacity
  into session_capacity
  from public.ticket_availabilities ta
  where ta.ticket_id = new.ticket_id
    and ta.date = new.valid_date
    and ta.time_slot is not distinct from new.time_slot
  limit 1;

  if session_capacity is not null and session_capacity > 0 and next_number > session_capacity then
    new.queue_overflow := true;
  else
    new.queue_overflow := false;
  end if;

  return new;
end;
$$;

drop trigger if exists purchased_tickets_assign_queue_number on public.purchased_tickets;
create trigger purchased_tickets_assign_queue_number
before insert on public.purchased_tickets
for each row
execute function public.assign_purchased_ticket_queue_number();

create index if not exists idx_purchased_tickets_session_queue
  on public.purchased_tickets (ticket_id, valid_date, time_slot, queue_number);

create unique index if not exists ux_purchased_tickets_session_queue
  on public.purchased_tickets (ticket_id, valid_date, time_slot, queue_number)
  where time_slot is not null and queue_number is not null;
