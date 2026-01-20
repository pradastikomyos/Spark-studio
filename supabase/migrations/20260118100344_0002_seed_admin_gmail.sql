insert into public.user_role_assignments (user_id, role_name)
select u.id, 'super_admin'
from auth.users u
where lower(u.email) = 'admin@gmail.com'
on conflict do nothing;

