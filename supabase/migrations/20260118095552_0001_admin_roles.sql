create table if not exists public.user_role_assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_name)
);

alter table public.user_role_assignments enable row level security;

drop policy if exists "read own roles" on public.user_role_assignments;
create policy "read own roles"
on public.user_role_assignments
for select
to authenticated
using (user_id = auth.uid());

