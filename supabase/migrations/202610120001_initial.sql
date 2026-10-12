begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create extension if not exists pgcrypto with schema extensions;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  created_at timestamptz not null default now()
);
create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id),
  email text not null,
  display_name text not null check (length(trim(display_name)) between 1 and 200),
  role text not null check (role in ('owner','manager','dispatcher','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index staff_members_organization_idx on public.staff_members(organization_id);
create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  email text not null check (email = lower(trim(email))),
  display_name text not null check (length(trim(display_name)) between 1 and 200),
  role text not null check (role in ('manager','dispatcher','viewer')),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);
create unique index pending_invite_email_idx on public.staff_invitations(email) where accepted_at is null;
create index staff_invitations_organization_idx on public.staff_invitations(organization_id);

create function private.organization_id() returns uuid language sql stable security definer set search_path = '' as $$
  select organization_id from public.staff_members where user_id = (select auth.uid()) and active;
$$;
create function private.current_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.staff_members where user_id = (select auth.uid()) and active;
$$;
revoke all on function private.organization_id(), private.current_role() from public;
grant execute on function private.organization_id(), private.current_role() to authenticated;

create table public.drivers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null check (length(trim(name)) between 1 and 200), phone text not null check (length(trim(phone)) between 1 and 200),
  email text, license_number text not null check (length(trim(license_number)) between 1 and 200), license_expiry date,
  status text not null check (status in ('available','on_trip','unavailable')), notes text check (length(notes) <= 4000),
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, id), unique (organization_id, license_number)
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null check (length(trim(name)) between 1 and 200), plate_number text not null check (length(trim(plate_number)) between 1 and 200),
  category text not null check (category in ('sedan','suv','van','luxury')),
  capacity integer not null check (capacity between 1 and 1000),
  status text not null check (status in ('available','on_trip','maintenance')), notes text check (length(notes) <= 4000),
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, id), unique (organization_id, plate_number)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null check (length(trim(name)) between 1 and 200), phone text not null check (length(trim(phone)) between 1 and 200),
  email text, notes text check (length(notes) <= 4000),
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create table public.locations (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null check (length(trim(name)) between 1 and 200),
  kind text not null check (kind in ('airport','hotel','residence','office','other')),
  address text not null check (length(trim(address)) between 1 and 4000),
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create table public.route_pricing (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  pickup_location_id uuid not null, dropoff_location_id uuid not null,
  vehicle_category text not null check (vehicle_category in ('sedan','suv','van','luxury')),
  price_aed numeric(12,2) not null check (price_aed between 0 and 10000000),
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (organization_id, pickup_location_id) references public.locations(organization_id,id),
  foreign key (organization_id, dropoff_location_id) references public.locations(organization_id,id),
  check (pickup_location_id <> dropoff_location_id)
);
create unique index active_route_price_idx on public.route_pricing(organization_id,pickup_location_id,dropoff_location_id,vehicle_category) where not archived;
create table public.bookings (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  reference text not null default ('HT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  customer_id uuid not null, pickup_location_id uuid not null, dropoff_location_id uuid not null, driver_id uuid, vehicle_id uuid,
  pickup_at timestamptz not null, passengers integer not null check (passengers between 1 and 1000),
  flight_number text check (length(flight_number) <= 200),
  status text not null check (status in ('pending','confirmed','in_progress','completed','cancelled')),
  price_aed numeric(12,2) not null check (price_aed between 0 and 10000000),
  payment_status text not null check (payment_status in ('unpaid','paid','refunded')),
  notes text check (length(notes) <= 4000), archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, reference),
  foreign key (organization_id, customer_id) references public.customers(organization_id,id),
  foreign key (organization_id, pickup_location_id) references public.locations(organization_id,id),
  foreign key (organization_id, dropoff_location_id) references public.locations(organization_id,id),
  foreign key (organization_id, driver_id) references public.drivers(organization_id,id),
  foreign key (organization_id, vehicle_id) references public.vehicles(organization_id,id),
  check (pickup_location_id <> dropoff_location_id)
);
create index bookings_schedule_idx on public.bookings(organization_id,pickup_at) where not archived;
create index bookings_customer_idx on public.bookings(organization_id,customer_id);
create index bookings_driver_idx on public.bookings(organization_id,driver_id,pickup_at);
create index bookings_vehicle_idx on public.bookings(organization_id,vehicle_id,pickup_at);
create index bookings_pickup_idx on public.bookings(organization_id,pickup_location_id);
create index bookings_dropoff_idx on public.bookings(organization_id,dropoff_location_id);
create index pricing_pickup_idx on public.route_pricing(organization_id,pickup_location_id);
create index pricing_dropoff_idx on public.route_pricing(organization_id,dropoff_location_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id), actor_id uuid,
  table_name text not null, record_id text not null, operation text not null,
  -- Store identifiers and changed field names only, not contact details or secret values.
  changed_fields text[] not null default '{}', created_at timestamptz not null default now()
);
create index audit_events_org_time_idx on public.audit_events(organization_id,created_at desc);
create function private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
declare changed text[];
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(n.key), '{}') into changed from jsonb_each(to_jsonb(new)) n where n.value is distinct from to_jsonb(old)->n.key;
  else select array_agg(key) into changed from jsonb_each(to_jsonb(new)); end if;
  insert into public.audit_events(organization_id,actor_id,table_name,record_id,operation,changed_fields)
    values (new.organization_id,auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'user_id'),tg_op,changed);
  return new;
end; $$;
create function private.prepare_record() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.organization_id <> old.organization_id or new.created_at <> old.created_at then raise exception 'Record identity cannot be changed'; end if;
    new.updated_at = now();
  end if;
  return new;
end; $$;

-- Validate assignments inside PostgreSQL as well as forms. No flight tracking is inferred.
create function private.validate_booking() returns trigger language plpgsql security definer set search_path = '' as $$
declare available_capacity integer;
begin
  if new.archived or new.status in ('completed','cancelled') then return new; end if;
  if not exists (select 1 from public.customers where organization_id = new.organization_id and id = new.customer_id and not archived) then raise exception 'Choose an active customer'; end if;
  if (select count(*) from public.locations where organization_id = new.organization_id and id in (new.pickup_location_id,new.dropoff_location_id) and not archived) <> 2 then raise exception 'Choose active pickup and drop-off locations'; end if;
  if new.driver_id is not null and not exists (select 1 from public.drivers where organization_id = new.organization_id and id = new.driver_id and not archived and status <> 'unavailable' and (license_expiry is null or license_expiry >= (new.pickup_at at time zone 'Asia/Dubai')::date)) then raise exception 'Driver is unavailable or licence has expired'; end if;
  if new.vehicle_id is not null then
    select capacity into available_capacity from public.vehicles where organization_id = new.organization_id and id = new.vehicle_id and not archived and status <> 'maintenance';
    if available_capacity is null or available_capacity < new.passengers then raise exception 'Vehicle is unavailable or has insufficient capacity'; end if;
  end if;
  if new.status = 'in_progress' and (new.driver_id is null or new.vehicle_id is null) then raise exception 'Assign a driver and vehicle before starting a journey'; end if;
  return new;
end; $$;
create trigger validate_booking before insert or update on public.bookings for each row execute function private.validate_booking();

-- Deny hard deletes; archived records retain booking history and references.
do $$
declare t text; roles text;
begin
  foreach t in array array['drivers','vehicles','customers','locations','route_pricing','bookings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create index %I on public.%I(organization_id,archived,created_at desc)',t || '_org_archive_idx',t);
    execute format('create policy read_records on public.%I for select to authenticated using (organization_id = (select private.organization_id()))',t);
    roles := case when t in ('bookings','customers') then '(''owner'',''manager'',''dispatcher'')' else '(''owner'',''manager'')' end;
    execute format('create policy create_records on public.%I for insert to authenticated with check (organization_id = (select private.organization_id()) and (select private.current_role()) in %s)',t,roles);
    execute format('create policy update_records on public.%I for update to authenticated using (organization_id = (select private.organization_id()) and (select private.current_role()) in %s) with check (organization_id = (select private.organization_id()) and (select private.current_role()) in %s)',t,roles,roles);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update on public.%I to authenticated',t);
    execute format('create trigger prepare_record before update on public.%I for each row execute function private.prepare_record()',t);
    execute format('create trigger audit_record after insert or update on public.%I for each row execute function private.audit_change()',t);
  end loop;
end $$;

alter table public.organizations enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.organizations, public.staff_members, public.staff_invitations, public.audit_events from anon, authenticated;
grant select on public.organizations, public.staff_members, public.staff_invitations, public.audit_events to authenticated;
create policy organization_read on public.organizations for select to authenticated using (id = (select private.organization_id()));
create policy staff_read on public.staff_members for select to authenticated using (user_id = (select auth.uid()) or (organization_id = (select private.organization_id()) and (select private.current_role()) = 'owner'));
create policy invitations_read on public.staff_invitations for select to authenticated using (organization_id = (select private.organization_id()) and (select private.current_role()) = 'owner');
create policy audit_read on public.audit_events for select to authenticated using (organization_id = (select private.organization_id()) and (select private.current_role()) in ('owner','manager'));
create trigger audit_staff after insert or update on public.staff_members for each row execute function private.audit_change();
create trigger audit_invites after insert or update on public.staff_invitations for each row execute function private.audit_change();

-- Owner-only RPCs prevent client-side escalation and serialize last-owner protection.
create function public.set_staff_access(target_user_id uuid, new_role text, new_active boolean) returns void language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  org := private.organization_id();
  perform 1 from public.organizations where id = org for update;
  if private.current_role() is distinct from 'owner' then raise exception 'Only the owner may manage staff'; end if;
  if new_role is null or new_role not in ('owner','manager','dispatcher','viewer') or new_active is null then raise exception 'Invalid access settings'; end if;
  if not exists (select 1 from public.staff_members where user_id = target_user_id and organization_id = org) then raise exception 'Staff member not found'; end if;
  if exists (select 1 from public.staff_members where user_id = target_user_id and organization_id = org and role = 'owner' and active) and (new_role <> 'owner' or not new_active)
    and (select count(*) from public.staff_members where organization_id = org and role = 'owner' and active) <= 1 then raise exception 'Keep at least one active owner'; end if;
  update public.staff_members set role = new_role, active = new_active where user_id = target_user_id and organization_id = org;
end; $$;
create function public.reserve_staff_invitation(invite_email text, invite_name text, invite_role text) returns uuid language plpgsql security definer set search_path = '' as $$
declare org uuid; invite_id uuid; normalized_email text;
begin
  org := private.organization_id();
  perform 1 from public.organizations where id = org for update;
  if private.current_role() is distinct from 'owner' then raise exception 'Only the owner may invite staff'; end if;
  normalized_email := lower(trim(invite_email));
  if invite_role is null or invite_role not in ('manager','dispatcher','viewer') or invite_name is null or length(trim(invite_name)) not between 1 and 200 or normalized_email is null or length(normalized_email) > 254 or normalized_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Invalid invitation'; end if;
  if exists (select 1 from auth.users where lower(email) = normalized_email) then raise exception 'This email already has an account. Manage existing staff access or contact the account owner'; end if;
  -- Expired reservations are removed only within the current organization.
  delete from public.staff_invitations where organization_id = org and email = normalized_email and accepted_at is null and expires_at < now();
  insert into public.staff_invitations(organization_id,email,display_name,role,invited_by) values (org,normalized_email,trim(invite_name),invite_role,auth.uid()) returning id into invite_id;
  return invite_id;
end; $$;
create function public.cancel_staff_invitation(invitation_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  org := private.organization_id();
  perform 1 from public.organizations where id = org for update;
  if private.current_role() is distinct from 'owner' then raise exception 'Only the owner may cancel invitations'; end if;
  -- Supabase creates the invited Auth user immediately; disabling membership revokes data access.
  update public.staff_members m set active = false from public.staff_invitations i where i.id = invitation_id and i.organization_id = org and m.organization_id = org and lower(m.email) = i.email and m.role <> 'owner';
  update public.staff_invitations set expires_at = now() where id = invitation_id and organization_id = org;
end; $$;
create function private.accept_staff_invitation() returns trigger language plpgsql security definer set search_path = '' as $$
declare invitation public.staff_invitations;
begin
  select * into invitation from public.staff_invitations where email = lower(new.email) and accepted_at is null and expires_at > now() for update;
  if found then
    insert into public.staff_members(user_id,organization_id,email,display_name,role) values (new.id,invitation.organization_id,invitation.email,invitation.display_name,invitation.role);
    update public.staff_invitations set accepted_at = now() where id = invitation.id;
  end if;
  return new;
end; $$;
create trigger accept_staff_invitation after insert on auth.users for each row execute function private.accept_staff_invitation();
revoke all on function public.set_staff_access(uuid,text,boolean), public.reserve_staff_invitation(text,text,text), public.cancel_staff_invitation(uuid) from public, anon;
grant execute on function public.set_staff_access(uuid,text,boolean), public.reserve_staff_invitation(text,text,text), public.cancel_staff_invitation(uuid) to authenticated;
revoke all on function private.audit_change(), private.prepare_record(), private.validate_booking(), private.accept_staff_invitation() from public, anon, authenticated;
commit;
