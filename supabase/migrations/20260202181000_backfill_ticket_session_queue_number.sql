with sessions_with_numbers as (
  select distinct pt.ticket_id, pt.valid_date, pt.time_slot
  from public.purchased_tickets pt
  where pt.queue_number is not null
),
target as (
  select
    pt.id,
    row_number() over (
      partition by pt.ticket_id, pt.valid_date, pt.time_slot
      order by pt.created_at nulls last, pt.id
    ) as rn,
    ta.total_capacity
  from public.purchased_tickets pt
  left join public.ticket_availabilities ta
    on ta.ticket_id = pt.ticket_id
   and ta.date = pt.valid_date
   and ta.time_slot is not distinct from pt.time_slot
  where pt.queue_number is null
    and pt.time_slot is not null
    and pt.status = 'active'
    and pt.valid_date >= current_date
    and not exists (
      select 1
      from sessions_with_numbers s
      where s.ticket_id = pt.ticket_id
        and s.valid_date = pt.valid_date
        and s.time_slot is not distinct from pt.time_slot
    )
)
update public.purchased_tickets pt
set
  queue_number = target.rn,
  queue_overflow = case
    when target.total_capacity is not null and target.total_capacity > 0 and target.rn > target.total_capacity then true
    else false
  end
from target
where pt.id = target.id;
