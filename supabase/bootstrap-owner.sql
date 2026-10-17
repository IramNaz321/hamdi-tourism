-- Run manually in the Supabase SQL editor AFTER the migrations.
-- First create/verify the REAL owner's Auth user in the Supabase dashboard.
-- Replace both placeholders below. Never put passwords or tokens in this file.
-- This is deliberately NOT an automatic migration or fictional seed account.
begin;
do $$
declare
  owner_user_id uuid := '<REAL_OWNER_AUTH_USER_UUID>'::uuid;
  owner_name text := '<REAL_OWNER_DISPLAY_NAME>';
  org_id uuid;
  owner_email text;
begin
  select email into owner_email from auth.users where id = owner_user_id and email_confirmed_at is not null;
  if owner_email is null then raise exception 'Create and verify the real owner Auth user first'; end if;
  if owner_name = '<REAL_OWNER_DISPLAY_NAME>' or length(trim(owner_name)) not between 1 and 200 then raise exception 'Enter the real owner display name'; end if;
  if exists (select 1 from public.staff_members where user_id = owner_user_id) then raise exception 'This user already belongs to a business; do not bootstrap twice'; end if;
  insert into public.organizations(name) values ('Hamdi Tourism') returning id into org_id;
  insert into public.staff_members(user_id,organization_id,email,display_name,role)
    values (owner_user_id,org_id,owner_email,trim(owner_name),'owner');
end $$;
commit;
