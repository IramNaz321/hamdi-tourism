-- MANUAL REVIEW PROPOSAL ONLY. Not a migration; never run against production
-- until the live schema, policies, accounts, and intended organization have
-- been independently verified and this exact change is approved.
--
-- This changes the old owner's public.staff_members access row and creates
-- the new owner's membership row only when that Auth user has no membership.
-- It does not update or delete either Auth account or any business records.
-- Existing staff/audit and driver-access triggers remain enabled.
--
-- Rollback:
--   * If anything fails before COMMIT, the transaction is aborted; issue
--     ROLLBACK in the same SQL session.
--   * Before applying, record the organization UUID from the NOTICE emitted
--     below. After COMMIT, rollback requires a new, separately reviewed
--     transaction that verifies the rows still match the transfer result,
--     restores the old owner to owner/active, removes only the new owner's
--     staff_members row (not their Auth account), and verifies exactly one
--     active owner remains. Do not attempt ROLLBACK after COMMIT.

begin;

do $transfer$
declare
  old_owner constant uuid := '3fac97a0-fbd2-4cca-a8ef-2272011c6106';
  new_owner constant uuid := '988e629b-6770-4b93-b9ba-7c1bce325680';
  expected_email constant text := 'hamid.shah@mail.ru';
  new_display_name constant text := 'Hamid Shah';
  business_id uuid;
  old_auth_email text;
  new_auth_email text;
  new_auth_confirmed_at timestamptz;
  new_auth_deleted_at timestamptz;
  new_auth_banned_until timestamptz;
  active_owner_count bigint;
  owner_membership_count bigint;
  changed_count bigint;
  role_check text;
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.staff_members') is null
     or to_regclass('auth.users') is null then
    raise exception 'Expected organizations, staff_members, and auth.users tables are required';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.staff_members'::regclass
      and relrowsecurity
  ) then
    raise exception 'staff_members RLS is not enabled; inspect the live schema before proceeding';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_members'
  ) <> 1 or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_members'
      and policyname = 'staff_read'
      and permissive = 'PERMISSIVE'
      and cmd = 'SELECT'
      and roles = array['authenticated'::name]
      and with_check is null
      and regexp_replace(lower(qual), '[[:space:]]', '', 'g') =
        '((user_id=(selectauth.uid()asuid))or((organization_id=(selectprivate.organization_id()asorganization_id))and((selectprivate."current_role"()as"current_role")=''owner''::text)))'
  ) then
    raise exception 'staff_members authorization policies differ from the reviewed schema; inspect them before proceeding';
  end if;

  select pg_get_constraintdef(oid)
    into role_check
  from pg_constraint
  where conrelid = 'public.staff_members'::regclass
    and conname = 'staff_members_role_check'
    and contype = 'c';
  if role_check is null
     or role_check not like '%owner%'
     or role_check not like '%manager%'
     or role_check not like '%dispatcher%'
     or role_check not like '%viewer%'
     or role_check not like '%driver%' then
    raise exception 'staff_members role constraint differs from the reviewed schema';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.staff_members'::regclass
      and tgname = 'audit_staff'
      and not tgisinternal
      and tgenabled <> 'D'
  ) then
    raise exception 'Expected staff_members audit trigger is absent or disabled';
  end if;

  lock table public.staff_members in share row exclusive mode;

  select email
    into old_auth_email
  from auth.users
  where id = old_owner
  for update;
  if not found or old_auth_email is null then
    raise exception 'Old owner Auth account is missing or has no email';
  end if;

  select email, email_confirmed_at, deleted_at, banned_until
    into new_auth_email, new_auth_confirmed_at, new_auth_deleted_at, new_auth_banned_until
  from auth.users
  where id = new_owner
  for update;
  if not found
     or new_auth_email is null
     or lower(new_auth_email) <> expected_email
     or new_auth_confirmed_at is null
     or new_auth_deleted_at is not null
     or (new_auth_banned_until is not null and new_auth_banned_until > now())
     or length(new_display_name) > 200 then
    raise exception 'New owner Auth account must exist, have the expected confirmed email, and be neither deleted nor banned; approved staff display name must be valid';
  end if;

  select organization_id
    into business_id
  from public.staff_members
  where user_id = old_owner
    and role = 'owner'
    and active
  for update;
  if not found then
    raise exception 'Old owner is not an active Owner in staff_members';
  end if;

  perform 1
  from public.organizations
  where id = business_id
  for update;
  if not found then
    raise exception 'Old owner organization is missing';
  end if;

  if lower((
    select email
    from public.staff_members
    where user_id = old_owner
      and organization_id = business_id
  )) <> lower(old_auth_email) then
    raise exception 'Old owner staff email does not match the old Auth account';
  end if;

  if exists (
    select 1
    from public.staff_members
    where user_id = new_owner
  ) then
    raise exception 'New owner already has a staff membership; review it instead of changing or reassigning it';
  end if;

  if exists (
    select 1
    from public.staff_members
    where user_id = old_owner
      and organization_id = business_id
      and (role <> 'owner' or not active)
  ) then
    raise exception 'Old owner row changed during preflight';
  end if;

  select count(*)
    into active_owner_count
  from public.staff_members
  where organization_id = business_id
    and role = 'owner'
    and active;
  if active_owner_count <> 1 then
    raise exception 'Expected exactly one active Owner before transfer; found %', active_owner_count;
  end if;

  select count(*)
    into owner_membership_count
  from public.staff_members
  where role = 'owner';
  if owner_membership_count <> 1 then
    raise exception 'Expected the old owner to be the only Owner membership across the project; found %', owner_membership_count;
  end if;

  raise notice 'Transfer organization: %; new Auth email: %; profile name is present',
    business_id, new_auth_email;

  update public.staff_members
  set role = 'manager',
      active = false
  where organization_id = business_id
    and user_id = old_owner
    and role = 'owner'
    and active;
  get diagnostics changed_count = row_count;
  if changed_count <> 1 then
    raise exception 'Expected to deactivate and demote exactly the old owner; updated % rows', changed_count;
  end if;

  insert into public.staff_members(
    user_id, organization_id, email, display_name, role, active
  )
  values (
    new_owner, business_id, new_auth_email, new_display_name, 'owner', true
  );

  select count(*)
    into active_owner_count
  from public.staff_members
  where organization_id = business_id
    and role = 'owner'
    and active;
  select count(*)
    into owner_membership_count
  from public.staff_members
  where role = 'owner';
  if active_owner_count <> 1
     or owner_membership_count <> 1
     or not exists (
       select 1
       from public.staff_members
       where user_id = new_owner
         and organization_id = business_id
         and role = 'owner'
         and active
     )
     or not exists (
       select 1
       from public.staff_members
       where user_id = old_owner
         and organization_id = business_id
         and role = 'manager'
         and not active
     ) then
    raise exception 'Post-transfer verification failed: expected the new Owner active and the old Owner inactive as manager';
  end if;

  raise notice 'Verified exactly one active Owner in organization %', business_id;
end
$transfer$;

commit;
