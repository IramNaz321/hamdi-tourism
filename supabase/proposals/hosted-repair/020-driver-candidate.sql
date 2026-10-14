-- REVIEW ONLY. Not approved for production execution.
-- Hold: inspect 000 results and obtain separate approval for this entire step.
-- Source: 202610120008_driver_tracking.sql; SHA256 b4224e941c97339f67da406dda898dcb7a3ea50f5b6b692e95c8c2eb339fe1e1
-- No Owner membership, authentication account or operational data is seeded.
-- Pending additive migration: apply only after hosted audit, baseline and explicit approval.
-- Supersedes the unapplied driver-portal proposal; do not execute both.
-- No users, organizations or operational records are seeded.
begin;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
DO $repair_guard$
DECLARE retention_job_exists boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id='9f53250d-5e05-409d-9182-3d45448aa399'::uuid) THEN RAISE EXCEPTION 'Expected organization missing; no organization will be created.'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity) THEN RAISE EXCEPTION 'Review existing RLS before repair.'; END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('private', 'audit_change', '', '1d8587c1efe3d5daec6ee5a6edadef7d'),
      ('private', 'current_role', '', 'd6e002950d1b0dd938650c76fad5e92d'),
      ('private', 'route_safety', '', 'bc906e9576eb859adefd52a32030313b'),
      ('private', 'check_archive', '', 'de874c1b7310cb95c63416372d6a6066'),
      ('private', 'driver_access', '', '779c08eaff89e344fe9e95111d4bdb93'),
      ('private', 'prepare_price', '', '23bae229b7c1e6f4affb9eae5c669f36'),
      ('private', 'enquiry_status', '', '938cf56f95bf1977a285b08089f11297'),
      ('private', 'prepare_record', '', 'a4385189230fc728ed833365909f0847'),
      ('private', 'booking_history', '', '1ec4a38c9e27511cafc0edaa9b2ef960'),
      ('private', 'organization_id', '', '11a550aea7c418025e29bf81d180a8af'),
      ('private', 'inventory_safety', '', '7bbfce2be1fd8ef9399e1ca394d8beb7'),
      ('private', 'protect_settings', '', '89a0a3f2f631be5719719b238959c010'),
      ('private', 'validate_booking', '', 'dff183009ebbda40f39ee149be7572bb'),
      ('public', 'dashboard_summary', '', '1c3481f03de3059e6a49d3852b6ebced'),
      ('public', 'dashboard_financials', '', '50dfc9037525b05a05ea1f66decbbab6'),
      ('private', 'accept_staff_invitation', '', '717facce6eabcc1f9665684b5142c3f0'),
      ('private', 'lock_referenced_records', '', '1786f808886e1dfef6dd42c26967e8b3'),
      ('public', 'website_content', 'business_id uuid', 'ecec89abb1baf91c3f25db5770d70deb'),
      ('public', 'booking_financials', 'target_booking_id uuid', 'ec3197f036fe705fee94c3e60da9a65b'),
      ('public', 'cancel_staff_invitation', 'invitation_id uuid', '47125de9775fa305fce8ca0eee6d75b2'),
      ('public', 'reserve_driver_invitation', 'target_driver_id uuid', '23a3471e10ac02c242cc3108e9e32ebc'),
      ('public', 'set_staff_access', 'target_user_id uuid, new_role text, new_active boolean', 'cbffdc09fa5add4d27332954add65416'),
      ('public', 'driver_is_available', 'target_driver_id uuid, at_time timestamp with time zone', 'e199d0c0602e361e16f6e57277426d38'),
      ('public', 'reserve_staff_invitation', 'invite_email text, invite_name text, invite_role text', '6da43e360c536e94439ed2126dff3da6'),
      ('public', 'convert_booking_enquiry', 'target_enquiry_id uuid, outbound_end timestamp with time zone, return_end timestamp with time zone', '692d568805580f4d8c92c2de8528f6df'),
      ('public', 'calculate_transfer_quote', 'business_id uuid, pickup_id uuid, dropoff_id uuid, category text, transfer_kind text, extra_ids uuid[]', 'e0b3d8f31325141d4cc43120a00566e0'),
      ('public', 'submit_booking_enquiry', 'business_id uuid, customer_name text, customer_email text, customer_phone text, pickup_id uuid, dropoff_id uuid, pickup_time timestamp with time zone, return_time timestamp with time zone, passenger_count integer, luggage_count integer, category text, transfer_kind text, flight text, customer_notes text, extra_ids uuid[], expected_total numeric', '90ad39173d0247c23f1d0acad22b5776')
    ) AS expected(schema_name, function_name, arguments, definition_md5)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname=expected.schema_name AND p.proname=expected.function_name
        AND pg_get_function_identity_arguments(p.oid)=expected.arguments
        AND md5(pg_get_functiondef(p.oid))=expected.definition_md5
    )
  ) THEN RAISE EXCEPTION 'Function definitions differ from the reviewed reference. Stop and inspect; do not replace blindly.'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['public.driver_trip_events','public.trip_live_locations','public.driver_trip_progress','public.trip_location_consent','public.passenger_tracking_access']::text[]) AS t(name) WHERE to_regclass(t.name) IS NOT NULL) THEN RAISE EXCEPTION 'Partial or concurrent installation detected; no replay permitted.'; END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN (VALUES ('public','driver_profile'),('private','assigned_driver_id'),('private','can_track'),('public','admin_live_tracking'),('private','clear_trip_tracking'),('public','purge_expired_tracking'),('private','notify_tracking'),('private','terminal_assignment_guard'),('public','driver_trip_audit'),('public','tracking_snapshot'),('private','clear_disabled_driver_tracking'),('public','begin_trip_location'),('private','tracking_topic_allowed'),('public','driver_trip_history'),('public','set_driver_availability'),('public','stop_trip_location'),('public','driver_trip_action'),('private','live_trip_matches'),('public','driver_assigned_trips'),('public','set_passenger_tracking'),('public','share_trip_location')) AS expected(schema_name,function_name) ON n.nspname=expected.schema_name AND p.proname=expected.function_name) THEN RAISE EXCEPTION 'New RPC name already exists; inspect before replacement.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN RAISE EXCEPTION 'pg_cron retention prerequisite unavailable; obtain a reviewed retention plan first.'; END IF;
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE $job_sql$SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname='hamdi-private-tracking-retention')$job_sql$ INTO retention_job_exists;
    IF retention_job_exists THEN RAISE EXCEPTION 'Retention job already exists; review instead of rescheduling it.'; END IF;
  END IF;
END;
$repair_guard$;

create index driver_active_trip_lookup on public.bookings(driver_id,pickup_at) where not archived and status in ('confirmed','in_progress');
create index driver_completed_trip_lookup on public.bookings(driver_id,pickup_at desc) where status='completed';
create index driver_completion_history_lookup on public.booking_status_history(booking_id,created_at) where new_status='completed';
create table public.driver_trip_progress (
 booking_id uuid primary key references public.bookings(id),
 driver_id uuid not null references public.drivers(id),
 accepted_at timestamptz, en_route_at timestamptz, handover_at timestamptz, arrived_at timestamptz, picked_up_at timestamptz, completed_at timestamptz
);
create unique index one_driver_departure on public.driver_trip_progress(driver_id) where (en_route_at is not null or handover_at is not null) and completed_at is null;
alter table public.driver_trip_progress enable row level security;
revoke all on public.driver_trip_progress from public, anon, authenticated;

create function private.assigned_driver_id() returns uuid language sql stable security definer set search_path='' as $$
 select d.id from public.drivers d join public.staff_members m on m.user_id=d.auth_user_id and m.organization_id=d.organization_id
 join auth.users u on u.id=m.user_id and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 where m.user_id=auth.uid() and m.active and m.role='driver' and not d.archived and d.account_status='active';
$$;
revoke all on function private.assigned_driver_id() from public,anon,authenticated;

create function public.driver_assigned_trips(page_number integer default 1,trip_scope text default 'all') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare driver uuid;
begin
 driver=private.assigned_driver_id();
 if driver is null then raise exception 'Driver access required' using errcode='42501'; end if;
 if page_number is null or page_number<1 or page_number>10000 or trip_scope is null or trip_scope not in ('all','active') then raise exception 'Invalid trip page or scope'; end if;
 return coalesce((select jsonb_agg(j order by j->>'pickup_at') from (
 select jsonb_build_object('id',b.id,'reference',b.reference,'status',b.status,'pickup_at',b.pickup_at,
 'pickup',a.name,'destination',z.name,'pickup_latitude',a.latitude,'pickup_longitude',a.longitude,
 'destination_latitude',z.latitude,'destination_longitude',z.longitude,'passengers',b.passengers,'luggage',b.luggage,
 'flight_number',b.flight_number,'flight_status',b.flight_status,'instructions',b.notes,'customer_name',c.name,'customer_phone',c.phone,
 'vehicle',coalesce(nullif(concat_ws(' ',v.make,v.model),''),v.name),'registration',v.plate_number,
 'accepted_at',p.accepted_at,'en_route_at',p.en_route_at,'handover_at',p.handover_at,'arrived_at',p.arrived_at,'picked_up_at',p.picked_up_at,'completed_at',p.completed_at) as j
 from public.bookings b
 join public.drivers d on d.id=b.driver_id and d.organization_id=b.organization_id
 join public.customers c on c.id=b.customer_id and c.organization_id=b.organization_id
 join public.locations a on a.id=b.pickup_location_id and a.organization_id=b.organization_id
 join public.locations z on z.id=b.dropoff_location_id and z.organization_id=b.organization_id
 left join public.vehicles v on v.id=b.vehicle_id and v.organization_id=b.organization_id
 left join public.driver_trip_progress p on p.booking_id=b.id and p.driver_id=b.driver_id
 where b.driver_id=driver and not b.archived and b.status in ('confirmed','in_progress') and (trip_scope='all' or b.status='in_progress' or p.en_route_at is not null or p.handover_at is not null)
 order by b.pickup_at limit 100 offset ((page_number-1)*100)
 ) trips),'[]'::jsonb);
end; $$;

create table public.driver_trip_events (
 id bigint generated always as identity primary key, booking_id uuid not null references public.bookings(id),
 driver_id uuid not null references public.drivers(id), actor_id uuid references auth.users(id) on delete set null,
 event text not null check(event in ('accept','en_route','arrive','pickup','complete','handover')),
 created_at timestamptz not null default now()
);
create index driver_event_history on public.driver_trip_events(driver_id,created_at desc);
alter table public.driver_trip_events enable row level security;
revoke all on public.driver_trip_events from public,anon,authenticated;

create function public.driver_trip_action(trip_id uuid, action_name text) returns void language plpgsql security definer set search_path='' as $$
declare driver uuid; trip public.bookings; progress public.driver_trip_progress;
begin
 driver=private.assigned_driver_id();
 if driver is null then raise exception 'Driver access required' using errcode='42501'; end if;
 select * into trip from public.bookings where id=trip_id and driver_id=driver and not archived for update;
 if not found or trip.status not in ('confirmed','in_progress') then raise exception 'Assigned active trip required' using errcode='42501'; end if;
 insert into public.driver_trip_progress(booking_id,driver_id) values(trip_id,driver) on conflict do nothing;
 select * into progress from public.driver_trip_progress where booking_id=trip_id for update;
 if progress.driver_id<>driver then raise exception 'Dispatcher must review reassigned trip progress'; end if;
 if action_name<>'complete' and exists(select 1 from public.drivers where id=driver and license_expiry<(now() at time zone 'Asia/Dubai')::date) then raise exception 'Driver licence requires dispatcher review'; end if;
 if action_name in ('en_route','pickup','handover') then update public.bookings set updated_at=now() where id=trip_id; end if;
 case action_name
 when 'accept' then
  if trip.status<>'confirmed' or progress.accepted_at is not null then raise exception 'Trip cannot be accepted'; end if;
  update public.driver_trip_progress set accepted_at=now() where booking_id=trip_id;
 when 'en_route' then
  if trip.status<>'confirmed' or progress.accepted_at is null or progress.en_route_at is not null then raise exception 'Accept the trip before departure'; end if;
  update public.driver_trip_progress set en_route_at=now() where booking_id=trip_id;
 when 'handover' then
  if trip.status<>'in_progress' or progress.accepted_at is not null then raise exception 'An authorized active reassignment is required'; end if;
  update public.driver_trip_progress set accepted_at=now(),handover_at=now() where booking_id=trip_id;
 when 'arrive' then
  if trip.status<>'confirmed' or progress.en_route_at is null or progress.arrived_at is not null then raise exception 'Record departure before marking arrival'; end if;
  update public.driver_trip_progress set arrived_at=now() where booking_id=trip_id;
 when 'pickup' then
  if trip.status<>'confirmed' or progress.arrived_at is null or progress.picked_up_at is not null then raise exception 'Record arrival before pickup'; end if;
  update public.bookings set status='in_progress' where id=trip_id;
  update public.driver_trip_progress set picked_up_at=now() where booking_id=trip_id;
 when 'complete' then
  if trip.status<>'in_progress' or (progress.picked_up_at is null and progress.handover_at is null) then raise exception 'Trip must be in progress'; end if;
  update public.bookings set status='completed' where id=trip_id;
  update public.driver_trip_progress set completed_at=now() where booking_id=trip_id;
 else raise exception 'Invalid trip action';
 end case;
 insert into public.driver_trip_events(booking_id,driver_id,actor_id,event) values(trip_id,driver,auth.uid(),action_name);
 perform private.notify_tracking(trip_id);
end; $$;
revoke all on function public.driver_assigned_trips(integer,text),public.driver_trip_action(uuid,text) from public,anon;
grant execute on function public.driver_assigned_trips(integer,text),public.driver_trip_action(uuid,text) to authenticated;


create function public.driver_profile() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare driver uuid; begin
 driver=private.assigned_driver_id(); if driver is null then raise exception 'Driver access required' using errcode='42501'; end if;
 return (select jsonb_build_object('version',2,'id',id,'name',name,'availability',status,'available_now',public.driver_is_available(id)) from public.drivers where id=driver);
end; $$;
create function public.set_driver_availability(available boolean) returns void language plpgsql security definer set search_path='' as $$
declare driver uuid; begin
 driver=private.assigned_driver_id(); if driver is null then raise exception 'Driver access required' using errcode='42501'; end if;
 if available is null then raise exception 'Choose availability'; end if;
 update public.drivers set status=case when available then 'available' else 'unavailable' end where id=driver;
end; $$;
create function public.driver_trip_history(page_number integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare driver uuid; begin
 driver=private.assigned_driver_id(); if driver is null then raise exception 'Driver access required' using errcode='42501'; end if;
 if page_number<1 or page_number>10000 then raise exception 'Invalid page'; end if;
 return coalesce((select jsonb_agg(t) from (
  select b.reference,a.name as pickup,z.name as destination,b.pickup_at,h.completed_at
  from public.bookings b join public.locations a on a.id=b.pickup_location_id join public.locations z on z.id=b.dropoff_location_id
  left join lateral(select min(created_at) as completed_at from public.booking_status_history where booking_id=b.id and new_status='completed') h on true
  where b.driver_id=driver and b.status='completed' order by h.completed_at desc nulls last,b.pickup_at desc limit 20 offset ((page_number-1)*20)
 ) t),'[]'::jsonb);
end; $$;

create table public.passenger_tracking_access (
 booking_id uuid not null references public.bookings(id),user_id uuid not null references auth.users(id) on delete cascade,
 granted_by uuid not null references auth.users(id),expires_at timestamptz not null,revoked boolean not null default false,
 primary key(booking_id,user_id)
);
alter table public.passenger_tracking_access enable row level security;
revoke all on public.passenger_tracking_access from public,anon,authenticated;
create index tracking_access_expiry on public.passenger_tracking_access(expires_at);

create function private.can_track(trip uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.bookings b where b.id=trip and exists(select 1 from auth.users u where u.id=auth.uid() and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now())) and (
  exists(select 1 from public.staff_members m where m.user_id=auth.uid() and m.active and m.organization_id=b.organization_id and m.role in ('owner','manager','dispatcher','viewer'))
  or (b.driver_id=private.assigned_driver_id() and b.status in ('confirmed','in_progress') and not b.archived)
  or (not exists(select 1 from public.staff_members m where m.user_id=auth.uid() and m.role='driver') and exists(select 1 from public.passenger_tracking_access a where a.booking_id=b.id and a.user_id=auth.uid() and not a.revoked and a.expires_at>now()))
 ));
$$;
revoke all on function private.can_track(uuid) from public,anon;
grant execute on function private.can_track(uuid) to authenticated;

create table public.trip_live_locations (
 booking_id uuid primary key references public.bookings(id),organization_id uuid not null references public.organizations(id),
 driver_id uuid not null references public.drivers(id),latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),accuracy double precision not null check(accuracy between 0 and 5000),
 heading double precision check(heading>=0 and heading<360),captured_at timestamptz not null,received_at timestamptz not null default now()
);
create index live_location_retention on public.trip_live_locations(received_at);
alter table public.trip_live_locations enable row level security;
revoke all on public.trip_live_locations from public,anon,authenticated;
grant select on public.trip_live_locations to authenticated;
create function private.live_trip_matches(trip uuid,assigned uuid,business uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.bookings b join public.drivers d on d.id=b.driver_id
 join public.vehicles v on v.id=b.vehicle_id and v.organization_id=b.organization_id and v.status in ('available','on_trip') and (v.registration_expiry is null or v.registration_expiry>=(now() at time zone 'Asia/Dubai')::date)
 join public.staff_members m on m.user_id=d.auth_user_id and m.active and m.role='driver'
 join auth.users u on u.id=m.user_id and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 join public.driver_trip_progress p on p.booking_id=b.id and p.driver_id=d.id
 where b.id=trip and b.driver_id=assigned and b.organization_id=business and m.organization_id=business
 and d.account_status='active' and d.status<>'unavailable' and not d.archived and (d.license_expiry is null or d.license_expiry>=(now() at time zone 'Asia/Dubai')::date) and b.status in ('confirmed','in_progress') and not b.archived
 and (p.en_route_at is not null or p.handover_at is not null));
$$;
revoke all on function private.live_trip_matches(uuid,uuid,uuid) from public,anon;
grant execute on function private.live_trip_matches(uuid,uuid,uuid) to authenticated;
create policy authorized_latest_location on public.trip_live_locations for select to authenticated using(private.can_track(booking_id) and received_at>now()-interval '2 minutes' and private.live_trip_matches(booking_id,driver_id,organization_id));

create function private.notify_tracking(trip uuid) returns void language plpgsql security definer set search_path='' as $$
declare business uuid; begin
 select organization_id into business from public.bookings where id=trip;
 -- No coordinates, passenger details or status in channel payloads. Every fetch reauthorizes.
 perform realtime.send('{"changed":true}'::jsonb,'tracking_changed','trip:'||trip::text,true);
 if business is not null then perform realtime.send('{"changed":true}'::jsonb,'tracking_changed','operations-tracking:'||business::text,true); end if;
end; $$;
revoke all on function private.notify_tracking(uuid) from public,anon,authenticated;
create function private.tracking_topic_allowed(topic text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare identifier uuid; begin
 if topic~'^trip:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return private.can_track(substring(topic from 6)::uuid); end if;
 if topic~'^operations-tracking:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  identifier=substring(topic from 21)::uuid;
  return exists(select 1 from public.staff_members m where m.user_id=auth.uid() and m.active and m.organization_id=identifier and m.role in ('owner','manager','dispatcher','viewer'));
 end if; return false;
end; $$;
revoke all on function private.tracking_topic_allowed(text) from public,anon;
grant execute on function private.tracking_topic_allowed(text) to authenticated;
create policy private_tracking_notifications on realtime.messages for select to authenticated using(extension='broadcast' and topic=realtime.topic() and private.tracking_topic_allowed(realtime.topic()));

create table public.trip_location_consent (
 booking_id uuid primary key references public.bookings(id),driver_id uuid not null references public.drivers(id),
 session_id uuid not null default gen_random_uuid(),started_at timestamptz not null default now(),expires_at timestamptz not null
);
alter table public.trip_location_consent enable row level security;
revoke all on public.trip_location_consent from public,anon,authenticated;
create function public.begin_trip_location(trip_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare driver uuid;trip public.bookings;session uuid;begin
 driver=private.assigned_driver_id();
 select * into trip from public.bookings where id=trip_id and driver_id=driver for update;
 if not found or not private.live_trip_matches(trip_id,driver,trip.organization_id) then raise exception 'Active assignment required' using errcode='42501'; end if;
 if exists(select 1 from public.trip_location_consent where booking_id=trip_id and started_at>clock_timestamp()-interval '5 seconds') then raise exception 'Wait before restarting sharing'; end if;
 insert into public.trip_location_consent(booking_id,driver_id,session_id,started_at,expires_at) values(trip_id,driver,gen_random_uuid(),clock_timestamp(),clock_timestamp()+interval '2 minutes')
 on conflict(booking_id) do update set driver_id=excluded.driver_id,session_id=excluded.session_id,started_at=excluded.started_at,expires_at=excluded.expires_at
 returning session_id into session;
 delete from public.trip_live_locations where booking_id=trip_id; perform private.notify_tracking(trip_id); return session;
end; $$;
create function public.share_trip_location(trip_id uuid,lat double precision,lng double precision,accuracy_m double precision,captured timestamptz,bearing double precision default null,consent_id uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare driver uuid; trip public.bookings; previous public.trip_live_locations; begin
 driver=private.assigned_driver_id(); if driver is null then raise exception 'Driver access required' using errcode='42501'; end if;
 select * into trip from public.bookings where id=trip_id and driver_id=driver and not archived and status in ('confirmed','in_progress') for update;
 if not found or not private.live_trip_matches(trip_id,driver,trip.organization_id) then raise exception 'Active assignment required' using errcode='42501'; end if;
 if consent_id is null or not exists(select 1 from public.trip_location_consent where booking_id=trip_id and driver_id=driver and session_id=consent_id and expires_at>clock_timestamp()) then raise exception 'Sharing consent expired or revoked' using errcode='42501'; end if;
 if lat is null or lng is null or accuracy_m is null or captured is null or not(lat between -90 and 90 and lng between -180 and 180 and accuracy_m between 0 and 5000) or (bearing is not null and not(bearing>=0 and bearing<360)) then raise exception 'Invalid GPS data'; end if;
 if captured<clock_timestamp()-interval '30 seconds' or captured>clock_timestamp()+interval '5 seconds' then raise exception 'GPS timestamp is stale or in the future'; end if;
 select * into previous from public.trip_live_locations where booking_id=trip_id for update;
 if found and (captured<=previous.captured_at or clock_timestamp()-previous.received_at<interval '5 seconds') then raise exception 'GPS update is out of order or too frequent'; end if;
 insert into public.trip_live_locations(booking_id,organization_id,driver_id,latitude,longitude,accuracy,heading,captured_at,received_at)
 values(trip_id,trip.organization_id,driver,lat,lng,accuracy_m,bearing,captured,clock_timestamp())
 on conflict(booking_id) do update set driver_id=excluded.driver_id,latitude=excluded.latitude,longitude=excluded.longitude,accuracy=excluded.accuracy,heading=excluded.heading,captured_at=excluded.captured_at,received_at=excluded.received_at;
 update public.trip_location_consent set expires_at=clock_timestamp()+interval '2 minutes' where booking_id=trip_id and session_id=consent_id;
 perform private.notify_tracking(trip_id);
end; $$;
create function public.stop_trip_location(trip_id uuid,consent_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.bookings where id=trip_id and driver_id=private.assigned_driver_id() for update;
 if not found then raise exception 'Assignment required' using errcode='42501'; end if;
 if not exists(select 1 from public.trip_location_consent where booking_id=trip_id and session_id=consent_id) then return; end if;
 delete from public.trip_location_consent where booking_id=trip_id;
 delete from public.trip_live_locations where booking_id=trip_id; perform private.notify_tracking(trip_id);
end; $$;

create function public.tracking_snapshot(trip_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; begin
 if not private.can_track(trip_id) then raise exception 'Tracking access required' using errcode='42501'; end if;
 select jsonb_build_object('id',b.id,'reference',b.reference,'status',b.status,'sharing_allowed',private.live_trip_matches(b.id,b.driver_id,b.organization_id),'driver_phase',case when b.status='completed' then 'completed' when p.handover_at is not null then 'handover' when p.picked_up_at is not null then 'picked_up' when p.arrived_at is not null then 'arrived' when p.en_route_at is not null then 'en_route' when p.accepted_at is not null then 'accepted' else 'assigned' end,
 'pickup',jsonb_build_object('id',a.id,'name',a.name,'latitude',a.latitude,'longitude',a.longitude),
 'destination',jsonb_build_object('id',z.id,'name',z.name,'latitude',z.latitude,'longitude',z.longitude),
 'driver_name',d.name,'vehicle',v.name,
 'location',case when private.live_trip_matches(b.id,b.driver_id,b.organization_id) and l.driver_id=b.driver_id and l.received_at>now()-interval '2 minutes' then jsonb_build_object('latitude',l.latitude,'longitude',l.longitude,'accuracy',l.accuracy,'captured_at',l.captured_at,'received_at',l.received_at,'heading',l.heading) else null end)
 into result from public.bookings b join public.locations a on a.id=b.pickup_location_id join public.locations z on z.id=b.dropoff_location_id
 left join public.drivers d on d.id=b.driver_id left join public.vehicles v on v.id=b.vehicle_id
 left join public.driver_trip_progress p on p.booking_id=b.id and p.driver_id=b.driver_id
 left join public.trip_live_locations l on l.booking_id=b.id where b.id=trip_id;
 return result;
end; $$;
create function public.admin_live_tracking() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare business uuid; begin
 business=private.organization_id();
 if private.current_role() is null or private.current_role() not in ('owner','manager','dispatcher','viewer') then raise exception 'Operations access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(public.tracking_snapshot(id)) from (select id from public.bookings where organization_id=business and not archived and status in ('confirmed','in_progress') order by pickup_at limit 100) b),'[]'::jsonb);
end; $$;

create function public.set_passenger_tracking(trip_id uuid,passenger_id uuid,expiry timestamptz,enabled boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if private.current_role() is distinct from 'owner' or not private.can_track(trip_id) or not exists(select 1 from public.bookings where id=trip_id and organization_id=private.organization_id()) then raise exception 'Owner authorization required' using errcode='42501'; end if;
 if enabled is null then raise exception 'Choose an access action'; end if;
 if not enabled then
  update public.passenger_tracking_access set revoked=true where booking_id=trip_id and user_id=passenger_id;
  perform private.notify_tracking(trip_id);return;
 end if;
 if exists(select 1 from public.staff_members where user_id=passenger_id and role='driver') then raise exception 'Driver accounts cannot receive passenger tracking grants'; end if;
 if expiry is null or expiry<=now() or expiry>now()+interval '7 days' or not exists(select 1 from auth.users where id=passenger_id and email_confirmed_at is not null and deleted_at is null and (banned_until is null or banned_until<=now())) then raise exception 'Confirmed passenger and bounded expiry required'; end if;
 insert into public.passenger_tracking_access(booking_id,user_id,granted_by,expires_at,revoked) values(trip_id,passenger_id,auth.uid(),expiry,not enabled)
 on conflict(booking_id,user_id) do update set granted_by=excluded.granted_by,expires_at=excluded.expires_at,revoked=excluded.revoked;
 perform private.notify_tracking(trip_id);
end; $$;

create function private.clear_trip_tracking() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.driver_id is distinct from old.driver_id or new.status='cancelled' then
  delete from public.driver_trip_progress where booking_id=new.id and completed_at is null;
 end if;
 if new.status='completed' then update public.driver_trip_progress set completed_at=now() where booking_id=new.id and completed_at is null; end if;
 if new.driver_id is distinct from old.driver_id or new.vehicle_id is distinct from old.vehicle_id or new.status is distinct from old.status or new.archived then
  if new.driver_id is distinct from old.driver_id or new.status not in ('confirmed','in_progress') or new.archived then delete from public.trip_live_locations where booking_id=new.id; delete from public.trip_location_consent where booking_id=new.id; end if;
  perform private.notify_tracking(new.id);
 end if; return new;
end; $$;
create trigger clear_trip_tracking after update of driver_id,vehicle_id,status,archived on public.bookings for each row execute function private.clear_trip_tracking();
create function private.clear_disabled_driver_tracking() returns trigger language plpgsql security definer set search_path='' as $$
declare trip uuid; begin
 if not new.active or new.role<>'driver' then
  for trip in select b.id from public.bookings b join public.drivers d on d.id=b.driver_id where d.auth_user_id=new.user_id loop
   delete from public.trip_live_locations where booking_id=trip; delete from public.trip_location_consent where booking_id=trip; perform private.notify_tracking(trip);
  end loop;
 end if; return new;
end; $$;
create trigger disabled_driver_tracking after update of active,role on public.staff_members for each row execute function private.clear_disabled_driver_tracking();
create function public.purge_expired_tracking() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.trip_live_locations where received_at<now()-interval '5 minutes';
 delete from public.passenger_tracking_access where expires_at<now() or revoked;
 delete from public.trip_location_consent where expires_at<now();
end; $$;
revoke all on function public.purge_expired_tracking() from public,anon,authenticated;
grant execute on function public.purge_expired_tracking() to service_role;
revoke all on function private.clear_trip_tracking(),private.clear_disabled_driver_tracking() from public,anon,authenticated;
revoke all on function public.driver_profile(),public.set_driver_availability(boolean),public.driver_trip_history(integer),public.begin_trip_location(uuid),public.share_trip_location(uuid,double precision,double precision,double precision,timestamptz,double precision,uuid),public.stop_trip_location(uuid,uuid),public.tracking_snapshot(uuid),public.admin_live_tracking(),public.set_passenger_tracking(uuid,uuid,timestamptz,boolean) from public,anon;
grant execute on function public.driver_profile(),public.set_driver_availability(boolean),public.driver_trip_history(integer),public.begin_trip_location(uuid),public.share_trip_location(uuid,double precision,double precision,double precision,timestamptz,double precision,uuid),public.stop_trip_location(uuid,uuid),public.tracking_snapshot(uuid),public.admin_live_tracking(),public.set_passenger_tracking(uuid,uuid,timestamptz,boolean) to authenticated;
create function private.terminal_assignment_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status in ('completed','cancelled') and (new.driver_id is distinct from old.driver_id or new.vehicle_id is distinct from old.vehicle_id) then raise exception 'Terminal assignments are historical; review corrections with the owner'; end if;
 return new;
end; $$;
create trigger terminal_assignment_guard before update of driver_id,vehicle_id on public.bookings for each row execute function private.terminal_assignment_guard();
revoke all on function private.terminal_assignment_guard() from public,anon,authenticated;
create function public.driver_trip_audit(trip_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if private.current_role() is null or private.current_role() not in ('owner','manager','dispatcher','viewer') or not private.can_track(trip_id) or not exists(select 1 from public.bookings where id=trip_id and organization_id=private.organization_id()) then raise exception 'Operations access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(row) from (select e.id,e.event,e.created_at,d.name as driver_name,m.display_name as actor_name from public.driver_trip_events e join public.drivers d on d.id=e.driver_id left join public.staff_members m on m.user_id=e.actor_id where e.booking_id=trip_id order by e.created_at,e.id limit 200) row),'[]'::jsonb);
end; $$;
revoke all on function public.driver_trip_audit(uuid) from public,anon;
grant execute on function public.driver_trip_audit(uuid) to authenticated;

grant select on public.driver_trip_progress to authenticated;
create policy authorized_trip_progress on public.driver_trip_progress for select to authenticated using(private.can_track(booking_id));
create or replace function public.driver_is_available(target_driver_id uuid,at_time timestamptz default now()) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.drivers d where d.id=target_driver_id and not d.archived and d.account_status='active' and d.status='available' and (d.license_expiry is null or d.license_expiry >= (at_time at time zone 'Asia/Dubai')::date)
 and not exists(select 1 from public.bookings b where b.driver_id=d.id and not b.archived and (b.status='in_progress' or (b.status='confirmed' and b.pickup_at<=at_time and (b.reserved_until is null or b.reserved_until>at_time))))
 and not exists(select 1 from public.driver_trip_progress p join public.bookings b on b.id=p.booking_id where p.driver_id=d.id and p.completed_at is null and (p.en_route_at is not null or p.handover_at is not null) and b.status in ('confirmed','in_progress') and not b.archived));
$$;
create or replace function public.dashboard_summary() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total_bookings',(select count(*) from public.bookings),
 'today_bookings',(select count(*) from public.bookings where not archived and (pickup_at at time zone 'Asia/Dubai')::date=(now() at time zone 'Asia/Dubai')::date),
 'active_trips',(select count(*) from public.bookings where not archived and status='in_progress'),
 'available_drivers',(select count(*) from public.drivers d where public.driver_is_available(d.id)),
 'registered_vehicles',(select count(*) from public.vehicles where not archived and status<>'inactive'),
 'verified_revenue',(select paid_total from public.dashboard_financials()));
$$;

-- Physical retention worker: only installation of this approved migration enables it.
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('hamdi-private-tracking-retention','* * * * *','select public.purge_expired_tracking()');
 end if;
end; $$;
notify pgrst, 'reload schema';
commit;
