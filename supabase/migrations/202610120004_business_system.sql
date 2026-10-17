begin;
create extension if not exists btree_gist with schema extensions;
-- PostgreSQL exclusion constraints need the extension's UUID GiST operator classes.
set local search_path = public, extensions;

alter table public.staff_members drop constraint staff_members_role_check;
alter table public.staff_members add constraint staff_members_role_check check (role in ('owner','manager','dispatcher','viewer','driver'));
alter table public.staff_invitations drop constraint staff_invitations_role_check;
alter table public.staff_invitations add constraint staff_invitations_role_check check (role in ('manager','dispatcher','viewer','driver'));
alter table public.drivers add column auth_user_id uuid unique references auth.users(id) on delete set null;
alter table public.drivers add column account_status text not null default 'active' check (account_status in ('active','inactive'));
alter table public.staff_invitations add column driver_id uuid;
alter table public.staff_invitations add foreign key (organization_id,driver_id) references public.drivers(organization_id,id);
alter table public.staff_invitations add constraint driver_invite_link check ((role = 'driver') = (driver_id is not null));

alter table public.vehicles drop constraint vehicles_status_check;
alter table public.vehicles add constraint vehicles_status_check check (status in ('available','on_trip','maintenance','unavailable','inactive'));
alter table public.vehicles add column make text check (length(make) <= 200);
alter table public.vehicles add column model text check (length(model) <= 200);
alter table public.vehicles add column registration_expiry date;
alter table public.vehicles add column luggage_capacity integer check (luggage_capacity between 0 and 1000);
alter table public.vehicles add column public_listed boolean not null default false;
alter table public.vehicles add column description text check (length(description) <= 4000);
alter table public.vehicles add column image_path text check (image_path is null or image_path like organization_id::text || '/vehicles/' || id::text || '/%');
alter table public.locations add column city text check (length(city) <= 200);
alter table public.locations add column airport_code text check (airport_code is null or airport_code ~ '^[A-Z]{3}$');
alter table public.locations add column public_listed boolean not null default false;
alter table public.locations add column featured_destination boolean not null default false;
alter table public.locations add column description text check (length(description) <= 4000);
alter table public.locations add column latitude numeric(9,6) check (latitude between -90 and 90);
alter table public.locations add column longitude numeric(9,6) check (longitude between -180 and 180);
alter table public.locations add constraint paired_coordinates check ((latitude is null) = (longitude is null));
alter table public.locations add column image_path text check (image_path is null or image_path like organization_id::text || '/locations/' || id::text || '/%');

create table public.business_settings (
  organization_id uuid primary key references public.organizations(id),
  display_name text not null check (length(trim(display_name)) between 1 and 200),
  contact_email text check (length(contact_email) <= 254), phone text check (length(phone) <= 100), whatsapp text check (whatsapp is null or whatsapp ~ '^\+?[0-9]{7,15}$'),
  address text check (length(address) <= 4000), about_text text check (length(about_text) <= 4000),
  booking_policy text check (length(booking_policy) <= 4000), cancellation_policy text check (length(cancellation_policy) <= 4000),
  currency text not null default 'AED' check (currency = 'AED'),
  published boolean not null default false, enquiries_enabled boolean not null default false,
  minimum_notice_hours integer not null default 0 check (minimum_notice_hours between 0 and 8760),
  turnaround_minutes integer not null default 0 check (turnaround_minutes between 0 and 1440),
  brand_color text not null default '#946732' check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  ink_color text not null default '#183431' check (ink_color ~ '^#[0-9a-fA-F]{6}$'),
  canvas_color text not null default '#f5f6f3' check (canvas_color ~ '^#[0-9a-fA-F]{6}$'),
  font_family text not null default 'system' check (font_family in ('system','serif')),
  logo_path text check (logo_path is null or logo_path like organization_id::text || '/logo/%'),
  updated_at timestamptz not null default now()
);
create table public.routes (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null check (length(trim(name)) between 1 and 200), pickup_location_id uuid not null, dropoff_location_id uuid not null,
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id,id), unique (organization_id,pickup_location_id,dropoff_location_id),
  foreign key (organization_id,pickup_location_id) references public.locations(organization_id,id),
  foreign key (organization_id,dropoff_location_id) references public.locations(organization_id,id),
  check (pickup_location_id <> dropoff_location_id)
);
-- Preserve actual existing routes, deriving names from their existing location records.
insert into public.routes(organization_id,name,pickup_location_id,dropoff_location_id)
  select distinct p.organization_id,left(a.name || ' → ' || b.name,200),p.pickup_location_id,p.dropoff_location_id
  from public.route_pricing p join public.locations a on a.id=p.pickup_location_id join public.locations b on b.id=p.dropoff_location_id;
alter table public.route_pricing add column route_id uuid;
alter table public.route_pricing add column name text;
alter table public.route_pricing add column additional_charges_aed numeric(12,2) not null default 0 check (additional_charges_aed between 0 and 10000000);
alter table public.route_pricing add column return_fare_aed numeric(12,2) check (return_fare_aed between 0 and 10000000);
alter table public.route_pricing add column public_listed boolean not null default false;
update public.route_pricing p set route_id=r.id,name=r.name from public.routes r where r.organization_id=p.organization_id and r.pickup_location_id=p.pickup_location_id and r.dropoff_location_id=p.dropoff_location_id;
alter table public.route_pricing alter column route_id set not null;
alter table public.route_pricing add unique (organization_id,id);
alter table public.route_pricing add foreign key (organization_id,route_id) references public.routes(organization_id,id);
create index pricing_route_idx on public.route_pricing(organization_id,route_id);
create table public.pricing_extras (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  name text not null check (length(trim(name)) between 1 and 200), route_pricing_id uuid not null,
  price_aed numeric(12,2) not null check (price_aed between 0 and 10000000),
  charge_basis text not null check (charge_basis in ('per_booking','per_leg')),
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (organization_id,route_pricing_id) references public.route_pricing(organization_id,id)
);
create index extras_pricing_idx on public.pricing_extras(organization_id,route_pricing_id);

create table public.booking_enquiries (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
  reference text not null default ('HE-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  name text not null check (length(trim(name)) between 1 and 200), email text not null check (length(email) <= 254), phone text not null check (length(phone) between 7 and 100),
  pickup_location_id uuid not null, dropoff_location_id uuid not null, pickup_at timestamptz not null, return_at timestamptz,
  passengers integer not null check (passengers between 1 and 1000), luggage integer not null check (luggage between 0 and 1000),
  transfer_type text not null check (transfer_type in ('one_way','return')),
  vehicle_category text not null check (vehicle_category in ('sedan','suv','van','luxury')), flight_number text check (length(flight_number)<=200),
  extras uuid[] not null default '{}', quoted_outbound_aed numeric(12,2) not null, quoted_return_aed numeric(12,2),
  pricing_snapshot jsonb not null, notes text check (length(notes)<=4000),
  status text not null default 'new' check (status in ('new','reviewed','converted','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id,id), unique (organization_id,reference),
  foreign key (organization_id,pickup_location_id) references public.locations(organization_id,id),
  foreign key (organization_id,dropoff_location_id) references public.locations(organization_id,id),
  check (pickup_location_id <> dropoff_location_id),
  check ((transfer_type='one_way' and return_at is null) or (transfer_type='return' and return_at>pickup_at))
);
create index enquiry_org_time_idx on public.booking_enquiries(organization_id,created_at desc);
create index enquiry_rate_idx on public.booking_enquiries(organization_id,email,created_at);
alter table public.bookings add unique (organization_id,id);
alter table public.bookings add column enquiry_id uuid;
alter table public.bookings add foreign key (organization_id,enquiry_id) references public.booking_enquiries(organization_id,id);
alter table public.bookings add column return_of_booking_id uuid;
alter table public.bookings add foreign key (organization_id,return_of_booking_id) references public.bookings(organization_id,id);
alter table public.bookings add column end_at timestamptz;
alter table public.bookings add column reserved_until timestamptz;
alter table public.bookings add column luggage integer check (luggage between 0 and 1000);
alter table public.bookings add column vehicle_category text check (vehicle_category in ('sedan','suv','van','luxury'));
alter table public.bookings add column cancellation_reason text check (length(cancellation_reason)<=4000);
alter table public.bookings add column flight_status text not null default 'not_recorded' check (flight_status in ('not_recorded','scheduled','delayed','arrived','cancelled'));
alter table public.bookings add column flight_status_updated_at timestamptz;
alter table public.bookings add constraint trip_time_check check (end_at is null or end_at>pickup_at);
-- No durations or categories are fabricated for historical bookings. Real values must be entered before confirming/editing an active legacy assignment.
alter table public.bookings add constraint driver_schedule_exclusion exclude using gist
 (organization_id with =,driver_id with =,tstzrange(pickup_at,reserved_until,'[)') with &&)
 where (not archived and status in ('confirmed','in_progress') and driver_id is not null and reserved_until is not null);
alter table public.bookings add constraint vehicle_schedule_exclusion exclude using gist
 (organization_id with =,vehicle_id with =,tstzrange(pickup_at,reserved_until,'[)') with &&)
 where (not archived and status in ('confirmed','in_progress') and vehicle_id is not null and reserved_until is not null);
create index booking_enquiry_idx on public.bookings(organization_id,enquiry_id);
create table public.booking_status_history (
  id bigint generated always as identity primary key, organization_id uuid not null references public.organizations(id), booking_id uuid not null,
  old_status text, new_status text not null, reason text, actor_id uuid, created_at timestamptz not null default now(),
  foreign key (organization_id,booking_id) references public.bookings(organization_id,id)
);
create index status_history_booking_idx on public.booking_status_history(organization_id,booking_id,created_at desc);
create table public.booking_assignments (
  id bigint generated always as identity primary key, organization_id uuid not null references public.organizations(id), booking_id uuid not null,
  driver_id uuid, vehicle_id uuid, actor_id uuid, created_at timestamptz not null default now(),
  foreign key (organization_id,booking_id) references public.bookings(organization_id,id),
  foreign key (organization_id,driver_id) references public.drivers(organization_id,id),
  foreign key (organization_id,vehicle_id) references public.vehicles(organization_id,id)
);
create index assignments_booking_idx on public.booking_assignments(organization_id,booking_id,created_at desc);
create table public.verified_payments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), booking_id uuid not null,
  provider text not null check (length(provider) between 1 and 100), provider_event_id text not null check (length(provider_event_id) between 1 and 300),
  kind text not null check (kind in ('charge','refund')), amount_aed numeric(12,2) not null check (amount_aed>0), currency text not null check (currency='AED'),
  verified_at timestamptz not null, created_at timestamptz not null default now(), unique(provider,provider_event_id),
  foreign key (organization_id,booking_id) references public.bookings(organization_id,id)
);
create index verified_payments_booking_idx on public.verified_payments(organization_id,booking_id);
-- Only a future trusted server integration, after validating the provider signature/event, may insert verified payments.
-- No manual entry endpoint or fake payment integration exists.
revoke all on public.verified_payments from anon,authenticated;
grant select on public.verified_payments to authenticated;
grant select,insert on public.verified_payments to service_role;

create or replace function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
declare changed text[];
begin
 if tg_op='UPDATE' then select coalesce(array_agg(n.key),'{}') into changed from jsonb_each(to_jsonb(new)) n where n.value is distinct from to_jsonb(old)->n.key;
 else select array_agg(key) into changed from jsonb_each(to_jsonb(new)); end if;
 insert into public.audit_events(organization_id,actor_id,table_name,record_id,operation,changed_fields)
 values(new.organization_id,auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'user_id',new.organization_id::text),tg_op,changed);
 return new;
end; $$;
create function private.protect_settings() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.organization_id<>old.organization_id then raise exception 'Business identity cannot change'; end if;
 new.updated_at=now(); return new;
end; $$;
create trigger protect_settings before insert or update on public.business_settings for each row execute function private.protect_settings();
create trigger audit_settings after insert or update on public.business_settings for each row execute function private.audit_change();
create function private.prepare_price() returns trigger language plpgsql security definer set search_path='' as $$
declare route public.routes;
begin
 select * into route from public.routes where organization_id=new.organization_id and id=new.route_id and not archived for share;
 if not found then raise exception 'Choose an active route'; end if;
 new.pickup_location_id=route.pickup_location_id; new.dropoff_location_id=route.dropoff_location_id; new.name=route.name;
 return new;
end; $$;
-- Runs before check_archive so canonical endpoint fields are filled for inserts.
create trigger a_prepare_price before insert or update on public.route_pricing for each row execute function private.prepare_price();
create function private.lock_referenced_records() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Consistent order and row locks prevent archive/availability changes racing booking validation.
 perform 1 from public.locations where organization_id=new.organization_id and id in (new.pickup_location_id,new.dropoff_location_id) order by id for share;
 perform 1 from public.customers where organization_id=new.organization_id and id=new.customer_id for share;
 perform 1 from public.drivers where organization_id=new.organization_id and id=new.driver_id for share;
 perform 1 from public.vehicles where organization_id=new.organization_id and id=new.vehicle_id for share;
 return new;
end; $$;
create trigger a_lock_references before insert or update on public.bookings for each row execute function private.lock_referenced_records();
create or replace function private.validate_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare fleet public.vehicles; buffer integer;
begin
 if tg_op='INSERT' and new.status<>'pending' then raise exception 'New bookings must start as pending'; end if;
 if tg_op='INSERT' and (new.end_at is null or new.vehicle_category is null or new.luggage is null) then raise exception 'Enter a journey end time and vehicle category'; end if;
 if tg_op='UPDATE' then
   if new.payment_status is distinct from old.payment_status then raise exception 'Payments require verified provider records'; end if;
   if new.status<>old.status and not (
     (old.status='pending' and new.status in ('confirmed','cancelled')) or
     (old.status='confirmed' and new.status in ('in_progress','cancelled')) or
     (old.status='in_progress' and new.status in ('completed','cancelled'))
   ) then raise exception 'This booking status transition is not allowed'; end if;
 end if;
 if new.status='cancelled' and (tg_op='INSERT' or new.status is distinct from old.status) and length(trim(coalesce(new.cancellation_reason,'')))=0 then raise exception 'Record a cancellation reason'; end if;
 if (tg_op='INSERT' and new.flight_status<>'not_recorded') or (tg_op='UPDATE' and new.flight_status is distinct from old.flight_status) then
   if new.flight_status<>'not_recorded' and length(trim(coalesce(new.flight_number,'')))=0 then raise exception 'Enter a flight number before recording its status'; end if;
   new.flight_status_updated_at=now();
 elsif tg_op='UPDATE' then new.flight_status_updated_at=old.flight_status_updated_at; end if;
 if tg_op='INSERT' and new.payment_status<>'unpaid' then raise exception 'Payments require verified provider records'; end if;
 select coalesce(turnaround_minutes,0) into buffer from public.business_settings where organization_id=new.organization_id;
 new.reserved_until=case when new.end_at is null then null else new.end_at+make_interval(mins=>coalesce(buffer,0)) end;
 if new.archived or new.status in ('completed','cancelled') then return new; end if;
 if new.status in ('confirmed','in_progress') and (new.driver_id is null or new.vehicle_id is null or new.end_at is null or new.vehicle_category is null) then raise exception 'Assign a driver, vehicle, category and end time before confirming'; end if;
 if new.status in ('confirmed','in_progress') and exists(select 1 from public.bookings b where b.organization_id=new.organization_id and b.id<>new.id and not b.archived and b.status in ('confirmed','in_progress') and b.reserved_until is null and b.pickup_at<new.reserved_until and (b.driver_id=new.driver_id or b.vehicle_id=new.vehicle_id)) then raise exception 'Record the end time of an existing assignment before confirming another trip'; end if;
 if not exists (select 1 from public.customers where organization_id=new.organization_id and id=new.customer_id and not archived) then raise exception 'Choose an active customer'; end if;
 if (select count(*) from public.locations where organization_id=new.organization_id and id in (new.pickup_location_id,new.dropoff_location_id) and not archived)<>2 then raise exception 'Choose active pickup and drop-off locations'; end if;
 if new.driver_id is not null and not exists (select 1 from public.drivers where organization_id=new.organization_id and id=new.driver_id and not archived and account_status='active' and status<>'unavailable' and (license_expiry is null or license_expiry>=(new.pickup_at at time zone 'Asia/Dubai')::date)) then raise exception 'Driver is unavailable or licence has expired'; end if;
 if new.vehicle_id is not null then
  select * into fleet from public.vehicles where organization_id=new.organization_id and id=new.vehicle_id and not archived and status not in ('maintenance','unavailable','inactive');
  if not found or fleet.luggage_capacity is null or new.luggage is null or fleet.capacity<new.passengers or fleet.luggage_capacity<new.luggage or (new.vehicle_category is not null and fleet.category<>new.vehicle_category) or (fleet.registration_expiry is not null and fleet.registration_expiry<(new.pickup_at at time zone 'Asia/Dubai')::date) then raise exception 'Vehicle is unavailable, incompatible or has insufficient capacity'; end if;
 end if;
 return new;
end; $$;
create function private.booking_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or new.status is distinct from old.status then
  insert into public.booking_status_history(organization_id,booking_id,old_status,new_status,reason,actor_id) values(new.organization_id,new.id,case when tg_op='UPDATE' then old.status else null end,new.status,new.cancellation_reason,auth.uid());
 end if;
 if tg_op='INSERT' or new.driver_id is distinct from old.driver_id or new.vehicle_id is distinct from old.vehicle_id then
  insert into public.booking_assignments(organization_id,booking_id,driver_id,vehicle_id,actor_id) values(new.organization_id,new.id,new.driver_id,new.vehicle_id,auth.uid());
 end if;
 return new;
end; $$;
create trigger booking_history after insert or update on public.bookings for each row execute function private.booking_history();
create function private.driver_access() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.auth_user_id is not null then update public.staff_members set active=(new.account_status='active' and not new.archived) where user_id=new.auth_user_id and organization_id=new.organization_id and role='driver'; end if;
 return new;
end; $$;
-- Column-level grants below are the primary protection against changing Auth links.
create trigger driver_access after insert or update on public.drivers for each row execute function private.driver_access();
revoke insert,update on public.drivers from authenticated;
grant insert(organization_id,name,phone,email,license_number,license_expiry,status,notes,account_status),update(name,phone,email,license_number,license_expiry,status,notes,account_status,archived) on public.drivers to authenticated;

-- Read business operational data only for portal staff, never for the future driver app.
do $$ declare t text; roles text; begin
 foreach t in array array['drivers','vehicles','customers','locations','route_pricing','bookings'] loop
  execute format('drop policy read_records on public.%I',t);
  execute format('create policy read_records on public.%I for select to authenticated using (organization_id=(select private.organization_id()) and (select private.current_role()) in (''owner'',''manager'',''dispatcher'',''viewer''))',t);
 end loop;
 foreach t in array array['routes','pricing_extras'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create index %I on public.%I(organization_id,archived,created_at desc)',t||'_org_archive_idx',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to authenticated',t);
  execute format('create policy read_records on public.%I for select to authenticated using (organization_id=(select private.organization_id()) and (select private.current_role()) in (''owner'',''manager'',''dispatcher'',''viewer''))',t);
  execute format('create policy write_records on public.%I for insert to authenticated with check (organization_id=(select private.organization_id()) and (select private.current_role()) in (''owner'',''manager''))',t);
  execute format('create policy update_records on public.%I for update to authenticated using (organization_id=(select private.organization_id()) and (select private.current_role()) in (''owner'',''manager'')) with check (organization_id=(select private.organization_id()) and (select private.current_role()) in (''owner'',''manager''))',t);
  execute format('create trigger prepare_record before update on public.%I for each row execute function private.prepare_record()',t);
  execute format('create trigger audit_record after insert or update on public.%I for each row execute function private.audit_change()',t);
 end loop;
 foreach t in array array['business_settings','booking_enquiries','booking_status_history','booking_assignments','verified_payments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy read_records on public.%I for select to authenticated using (organization_id=(select private.organization_id()) and (select private.current_role()) in (''owner'',''manager'',''dispatcher'',''viewer''))',t);
 end loop;
end $$;
grant insert,update on public.business_settings to authenticated;
create policy owner_settings_insert on public.business_settings for insert to authenticated with check (organization_id=(select private.organization_id()) and (select private.current_role())='owner');
create policy owner_settings_update on public.business_settings for update to authenticated using (organization_id=(select private.organization_id()) and (select private.current_role())='owner') with check (organization_id=(select private.organization_id()) and (select private.current_role())='owner');
grant update(status) on public.booking_enquiries to authenticated;
create policy enquiries_update on public.booking_enquiries for update to authenticated using (organization_id=(select private.organization_id()) and (select private.current_role()) in ('owner','manager','dispatcher')) with check (organization_id=(select private.organization_id()) and (select private.current_role()) in ('owner','manager','dispatcher'));
create trigger audit_enquiry after insert or update on public.booking_enquiries for each row execute function private.audit_change();

create or replace function public.dashboard_financials() returns table(paid_total numeric,outstanding_total numeric) language sql stable security invoker set search_path='' as $$
 with paid as (select booking_id,sum(case when kind='charge' then amount_aed else -amount_aed end) total from public.verified_payments group by booking_id)
 select coalesce(sum(coalesce(p.total,0)) filter(where b.status='completed'),0),
 coalesce(sum(greatest(b.price_aed-coalesce(p.total,0),0)) filter(where b.status<>'cancelled' and not b.archived),0)
 from public.bookings b left join paid p on p.booking_id=b.id;
$$;
create function public.dashboard_summary() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total_bookings',(select count(*) from public.bookings),
 'today_bookings',(select count(*) from public.bookings where not archived and (pickup_at at time zone 'Asia/Dubai')::date=(now() at time zone 'Asia/Dubai')::date),
 'active_trips',(select count(*) from public.bookings where not archived and status='in_progress'),
 'available_drivers',(select count(*) from public.drivers d where not d.archived and d.account_status='active' and d.status='available' and (d.license_expiry is null or d.license_expiry >= (now() at time zone 'Asia/Dubai')::date) and not exists(select 1 from public.bookings b where b.driver_id=d.id and not b.archived and (b.status='in_progress' or (b.status='confirmed' and b.pickup_at<=now() and (b.reserved_until is null or b.reserved_until>now()))))),
 'registered_vehicles',(select count(*) from public.vehicles where not archived and status<>'inactive'),
 'verified_revenue',(select paid_total from public.dashboard_financials()));
$$;
revoke all on function public.dashboard_summary() from public,anon;
grant execute on function public.dashboard_summary() to authenticated;

-- Safe public projections: no direct anonymous table access, plates, contacts or assignments.
create function public.website_content(business_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('settings',jsonb_build_object('display_name',s.display_name,'contact_email',s.contact_email,'phone',s.phone,'whatsapp',s.whatsapp,'address',s.address,'about_text',s.about_text,'booking_policy',s.booking_policy,'cancellation_policy',s.cancellation_policy,'currency',s.currency,'enquiries_enabled',s.enquiries_enabled,'brand_color',s.brand_color,'ink_color',s.ink_color,'canvas_color',s.canvas_color,'font_family',s.font_family,'logo_path',s.logo_path),
 'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'city',l.city,'kind',l.kind,'airport_code',l.airport_code,'description',l.description,'image_path',l.image_path,'featured_destination',l.featured_destination) order by l.name) from public.locations l where l.organization_id=s.organization_id and l.public_listed and not l.archived),'[]'::jsonb),
 'fleet',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'category',v.category,'capacity',v.capacity,'luggage_capacity',v.luggage_capacity,'description',v.description,'image_path',v.image_path) order by v.name) from public.vehicles v where v.organization_id=s.organization_id and v.public_listed and not v.archived and v.status<>'inactive'),'[]'::jsonb))
 from public.business_settings s where s.organization_id=business_id and s.published;
$$;
revoke all on function public.website_content(uuid) from public;
grant execute on function public.website_content(uuid) to anon,authenticated;

-- Update the invitation trigger and protect driver accounts from portal-role promotion.
create or replace function private.accept_staff_invitation() returns trigger language plpgsql security definer set search_path='' as $$
declare invitation public.staff_invitations;
begin
 select * into invitation from public.staff_invitations where email=lower(new.email) and accepted_at is null and expires_at>now() for update;
 if found then
  if invitation.role='driver' and not exists(select 1 from public.drivers where id=invitation.driver_id and organization_id=invitation.organization_id and account_status='active' and not archived and auth_user_id is null) then raise exception 'Driver is not available for invitation'; end if;
  insert into public.staff_members(user_id,organization_id,email,display_name,role) values(new.id,invitation.organization_id,invitation.email,invitation.display_name,invitation.role);
  if invitation.role='driver' then update public.drivers set auth_user_id=new.id where id=invitation.driver_id and organization_id=invitation.organization_id; end if;
  update public.staff_invitations set accepted_at=now() where id=invitation.id;
 end if; return new;
end; $$;
create function public.reserve_driver_invitation(target_driver_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare org uuid; d public.drivers; invite_id uuid;
begin
 org=private.organization_id(); perform 1 from public.organizations where id=org for update;
 if private.current_role() is distinct from 'owner' then raise exception 'Only the owner may invite drivers'; end if;
 select * into d from public.drivers where organization_id=org and id=target_driver_id and not archived and account_status='active' for update;
 if not found or d.auth_user_id is not null or d.email is null then raise exception 'Choose an active driver with an email and no existing account'; end if;
 if exists(select 1 from auth.users where lower(email)=lower(trim(d.email))) then raise exception 'This email already has an account'; end if;
 delete from public.staff_invitations where organization_id=org and email=lower(trim(d.email)) and accepted_at is null and expires_at<now();
 insert into public.staff_invitations(organization_id,email,display_name,role,driver_id,invited_by) values(org,lower(trim(d.email)),d.name,'driver',d.id,auth.uid()) returning id into invite_id;
 return invite_id;
end; $$;
create or replace function public.set_staff_access(target_user_id uuid,new_role text,new_active boolean) returns void language plpgsql security definer set search_path='' as $$
declare org uuid; previous_role text;
begin
 org=private.organization_id(); perform 1 from public.organizations where id=org for update;
 if private.current_role() is distinct from 'owner' then raise exception 'Only the owner may manage staff'; end if;
 if new_role is null or new_role not in ('owner','manager','dispatcher','viewer','driver') or new_active is null then raise exception 'Invalid access settings'; end if;
 select role into previous_role from public.staff_members where user_id=target_user_id and organization_id=org;
 if not found then raise exception 'Staff member not found'; end if;
 if (previous_role='driver') <> (new_role='driver') then raise exception 'Driver accounts cannot be changed to portal roles'; end if;
 if exists(select 1 from public.staff_members where user_id=target_user_id and role='owner' and active) and (new_role<>'owner' or not new_active) and (select count(*) from public.staff_members where organization_id=org and role='owner' and active)<=1 then raise exception 'Keep at least one active owner'; end if;
 update public.staff_members set role=new_role,active=new_active where user_id=target_user_id and organization_id=org;
 if previous_role='driver' then update public.drivers set account_status=case when new_active then 'active' else 'inactive' end where organization_id=org and auth_user_id=target_user_id; end if;
end; $$;
revoke all on function public.reserve_driver_invitation(uuid) from public,anon;
grant execute on function public.reserve_driver_invitation(uuid) to authenticated;
revoke all on function private.protect_settings(),private.prepare_price(),private.lock_referenced_records(),private.booking_history(),private.driver_access() from public,anon,authenticated;
commit;
