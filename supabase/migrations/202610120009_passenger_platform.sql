begin;
-- Additive passenger platform. No operational seeds; all hosted application requires approval.
create table public.passenger_profiles (
 user_id uuid not null references auth.users(id) on delete cascade, organization_id uuid not null references public.organizations(id),
 customer_id uuid not null, active boolean not null default true, created_at timestamptz not null default now(),
 primary key(user_id,organization_id), unique(organization_id,customer_id),
 foreign key(organization_id,customer_id) references public.customers(organization_id,id)
);
create table public.passenger_booking_accounts (
 booking_id uuid primary key references public.bookings(id), user_id uuid not null, organization_id uuid not null,
 request_key uuid not null, quote_id uuid not null, created_at timestamptz not null default now(),
 foreign key(user_id,organization_id) references public.passenger_profiles(user_id,organization_id),
 foreign key(organization_id,booking_id) references public.bookings(organization_id,id), unique(user_id,organization_id,request_key,booking_id)
);
create index passenger_booking_user on public.passenger_booking_accounts(user_id,organization_id,created_at desc);
create table public.passenger_route_configuration (
 organization_id uuid not null references public.organizations(id), route_id uuid primary key,
 journey_minutes integer not null check(journey_minutes between 1 and 10080), return_minutes integer check(return_minutes between 1 and 10080),
 enabled boolean not null default false, foreign key(organization_id,route_id) references public.routes(organization_id,id)
);
create table public.passenger_platform_settings (
 organization_id uuid primary key references public.organizations(id), bookings_enabled boolean not null default false,
 privacy_policy text check(length(privacy_policy)<=8000), terms text check(length(terms)<=8000), updated_at timestamptz not null default now()
);
create table public.passenger_quotes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, organization_id uuid not null, vehicle_id uuid not null,
 journey jsonb not null, pricing jsonb not null, terms_snapshot jsonb not null, expires_at timestamptz not null default now()+interval '10 minutes',
 consumed_key uuid, created_at timestamptz not null default now(),
 foreign key(user_id,organization_id) references public.passenger_profiles(user_id,organization_id),
 foreign key(organization_id,vehicle_id) references public.vehicles(organization_id,id)
);
alter table public.passenger_booking_accounts add foreign key(quote_id) references public.passenger_quotes(id);
create unique index passenger_request_once on public.passenger_quotes(user_id,organization_id,consumed_key) where consumed_key is not null;
create table public.passenger_cancellation_requests (
 booking_id uuid primary key references public.bookings(id), user_id uuid not null references auth.users(id),
 reason text not null check(length(trim(reason)) between 1 and 2000), status text not null default 'requested' check(status in ('requested','reviewed')),
 created_at timestamptz not null default now()
);
create table public.payment_attempts (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id), organization_id uuid not null,
 user_id uuid not null references auth.users(id), amount_minor bigint not null check(amount_minor between 1 and 1000000000),currency text not null default 'aed' check(currency='aed'),
 session_id text unique, payment_intent_id text unique, charge_id text unique,
 status text not null default 'creating' check(status in ('creating','open','paid','failed','refunded')),
 refunded_minor bigint not null default 0 check(refunded_minor>=0 and refunded_minor<=amount_minor), created_at timestamptz not null default now(),
 foreign key(organization_id,booking_id) references public.bookings(organization_id,id)
);
create table public.payment_webhook_events (
 event_id text primary key check(length(event_id) between 1 and 300), event_type text not null, attempt_id uuid not null references public.payment_attempts(id),
 processed_at timestamptz not null default now()
);
create table public.passenger_notification_outbox (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 booking_id uuid not null references public.bookings(id), kind text not null, dedupe_key text not null unique,
 status text not null default 'queued' check(status in ('queued','sending','accepted','delivered','failed')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(), leased_until timestamptz,
 lease_token uuid, provider_id text unique, created_at timestamptz not null default now(), delivered_at timestamptz
);
create index notification_due on public.passenger_notification_outbox(next_attempt_at) where status in ('queued','sending');
create table public.concierge_usage (
 subject_hash text not null check(length(subject_hash)=64), window_start timestamptz not null, used integer not null default 0,
 primary key(subject_hash,window_start)
);
-- No private table has direct passenger mutations. RPCs expose minimal projections only.
do $$declare t text;begin foreach t in array array['passenger_profiles','passenger_booking_accounts','passenger_route_configuration','passenger_platform_settings','passenger_quotes','passenger_cancellation_requests','payment_attempts','payment_webhook_events','passenger_notification_outbox','concierge_usage'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;end$$;
grant select on public.passenger_cancellation_requests,public.payment_attempts to authenticated;
create policy operations_cancellation on public.passenger_cancellation_requests for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and b.organization_id=private.organization_id() and private.current_role() in ('owner','manager','dispatcher','viewer')));
create policy operations_payment_attempts on public.payment_attempts for select to authenticated using(organization_id=private.organization_id() and private.current_role() in ('owner','manager','dispatcher','viewer'));
create function private.passenger_user() returns uuid language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())) or exists(select 1 from public.staff_members m where m.user_id=auth.uid()) then raise exception 'Verified passenger account required' using errcode='42501';end if;
 return auth.uid();end;$$;
create function private.passenger_owns(trip uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.passenger_booking_accounts a join public.passenger_profiles p on p.user_id=a.user_id and p.organization_id=a.organization_id and p.active join auth.users u on u.id=p.user_id
 where a.booking_id=trip and a.user_id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and not exists(select 1 from public.staff_members m where m.user_id=u.id));$$;
revoke all on function private.passenger_user(),private.passenger_owns(uuid) from public,anon;
grant execute on function private.passenger_owns(uuid) to authenticated;
create function public.passenger_save_profile(business_id uuid,full_name text,phone_number text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.passenger_user(); customer uuid; mail text;begin
 if full_name is null or length(trim(full_name)) not between 1 and 200 or phone_number is null or length(trim(phone_number)) not between 7 and 100 then raise exception 'Check your name and phone number';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||business_id::text,0));
 if not exists(select 1 from public.business_settings where organization_id=business_id and published) then raise exception 'Business account unavailable';end if;
 select email into mail from auth.users where id=uid;
 select customer_id into customer from public.passenger_profiles where user_id=uid and organization_id=business_id and active;
 if customer is null then
 if exists(select 1 from public.passenger_profiles where user_id=uid and organization_id=business_id) then raise exception 'Account unavailable' using errcode='42501';end if;
 insert into public.customers(organization_id,name,email,phone) values(business_id,trim(full_name),mail,trim(phone_number)) returning id into customer;
 insert into public.passenger_profiles(user_id,organization_id,customer_id) values(uid,business_id,customer);
 else update public.customers set name=trim(full_name),email=mail,phone=trim(phone_number) where id=customer and not archived; if not found then raise exception 'Account unavailable';end if;end if;
 return jsonb_build_object('name',trim(full_name),'email',mail,'phone',trim(phone_number));end;$$;
create function public.passenger_profile(business_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.passenger_user(); result jsonb;begin
 select jsonb_build_object('name',c.name,'phone',c.phone,'email',u.email) into result from public.passenger_profiles p join public.customers c on c.id=p.customer_id join auth.users u on u.id=p.user_id where p.user_id=uid and p.organization_id=business_id and p.active and not c.archived;
 return result;end;$$;
create function public.passenger_booking_configuration(business_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',s.bookings_enabled and b.published and b.enquiries_enabled,'privacy_policy',s.privacy_policy,'terms',s.terms,'booking_policy',b.booking_policy,'cancellation_policy',b.cancellation_policy,
 'routes',coalesce((select jsonb_agg(jsonb_build_object('route_id',c.route_id,'pickup_id',r.pickup_location_id,'dropoff_id',r.dropoff_location_id,'return_supported',c.return_minutes is not null)) from public.passenger_route_configuration c join public.routes r on r.id=c.route_id and r.organization_id=c.organization_id where c.organization_id=business_id and c.enabled and not r.archived),'[]'::jsonb))
 from public.passenger_platform_settings s join public.business_settings b on b.organization_id=s.organization_id where s.organization_id=business_id and b.published;$$;
create function public.passenger_quote(business_id uuid,vehicle uuid,journey_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.passenger_user(); v public.vehicles; config public.passenger_route_configuration; q jsonb; rules jsonb; quote uuid; duration_end timestamptz; pickup timestamptz; return_pickup timestamptz; extra uuid[];begin
 if journey_input is null or jsonb_typeof(journey_input)<>'object' or journey_input->>'pickup_id' is null or journey_input->>'dropoff_id' is null or journey_input->>'passengers' is null or journey_input->>'luggage' is null or journey_input->>'transfer_type' is null or journey_input->>'transfer_type' not in ('one_way','return') or length(coalesce(journey_input->>'flight',''))>200 or jsonb_typeof(coalesce(journey_input->'extras','[]'))<>'array' then raise exception 'Invalid journey';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||business_id::text,0));
 if not exists(select 1 from public.passenger_profiles p join public.customers c on c.id=p.customer_id where p.user_id=uid and p.organization_id=business_id and p.active and not c.archived) then raise exception 'Complete your passenger profile first';end if;
 if (select count(*) from public.passenger_quotes where organization_id=business_id and created_at>now()-interval '1 hour')>=1000 then raise exception 'Online quotes temporarily unavailable';end if;
 if (select count(*) from public.passenger_quotes where user_id=uid and created_at>now()-interval '1 hour')>=30 then raise exception 'Quote limit reached. Contact our team';end if;
 select jsonb_build_object('terms',s.terms,'privacy',s.privacy_policy,'booking_policy',b.booking_policy,'cancellation_policy',b.cancellation_policy) into rules from public.passenger_platform_settings s join public.business_settings b on b.organization_id=s.organization_id
 where s.organization_id=business_id and s.bookings_enabled and b.published and b.enquiries_enabled and length(trim(s.terms))>0 and length(trim(s.privacy_policy))>0 and length(trim(b.booking_policy))>0 and length(trim(b.cancellation_policy))>0;
 if rules is null then raise exception 'Online bookings unavailable. Request an enquiry';end if;
 select * into v from public.vehicles where id=vehicle and organization_id=business_id and public_listed and not archived and status in ('available','on_trip') for share;
 if not found or v.capacity<(journey_input->>'passengers')::integer or v.luggage_capacity is null or v.luggage_capacity<(journey_input->>'luggage')::integer or (journey_input->>'passengers')::integer not between 1 and 1000 or (journey_input->>'luggage')::integer not between 0 and 1000 then raise exception 'Vehicle capacity unavailable';end if;
 select c.* into config from public.passenger_route_configuration c join public.routes r on r.id=c.route_id and r.organization_id=c.organization_id where c.organization_id=business_id and c.enabled and not r.archived and r.pickup_location_id=(journey_input->>'pickup_id')::uuid and r.dropoff_location_id=(journey_input->>'dropoff_id')::uuid for share of c,r;
 if not found then raise exception 'This route requires a manual enquiry';end if;
 pickup=(journey_input->>'pickup_at')::timestamptz; return_pickup=nullif(journey_input->>'return_at','')::timestamptz;
 if pickup is null or pickup<now()+(select make_interval(hours=>minimum_notice_hours) from public.business_settings where organization_id=business_id) or (v.registration_expiry is not null and v.registration_expiry<(pickup at time zone 'Asia/Dubai')::date) then raise exception 'Check your pickup time';end if;
 duration_end=pickup+make_interval(mins=>config.journey_minutes);
 if return_pickup is not null and v.registration_expiry is not null and v.registration_expiry<(return_pickup at time zone 'Asia/Dubai')::date then raise exception 'Selected vehicle unavailable';end if;
 if journey_input->>'transfer_type'='return' and (config.return_minutes is null or return_pickup is null or return_pickup<=duration_end) then raise exception 'Return journey unavailable or overlaps outbound';end if;
 if journey_input->>'transfer_type'='one_way' and return_pickup is not null then raise exception 'Check your return journey';end if;
 select coalesce(array_agg(value::uuid),'{}') into extra from jsonb_array_elements_text(coalesce(journey_input->'extras','[]'));
 perform 1 from public.route_pricing where organization_id=business_id and pickup_location_id=(journey_input->>'pickup_id')::uuid and dropoff_location_id=(journey_input->>'dropoff_id')::uuid and vehicle_category=v.category for share;
 perform 1 from public.pricing_extras where organization_id=business_id and id=any(extra) order by id for share;
 q=public.calculate_transfer_quote(business_id,(journey_input->>'pickup_id')::uuid,(journey_input->>'dropoff_id')::uuid,v.category,journey_input->>'transfer_type',extra);
 insert into public.passenger_quotes(user_id,organization_id,vehicle_id,journey,pricing,terms_snapshot) values(uid,business_id,vehicle,journey_input||jsonb_build_object('category',v.category,'end_at',duration_end,'return_end_at',case when return_pickup is not null then return_pickup+make_interval(mins=>config.return_minutes) else null end),q,rules) returning id into quote;
 return jsonb_build_object('id',quote,'expires_at',now()+interval '10 minutes','pricing',q,'terms',rules,'availability','pending_dispatch');end;$$;
create function public.passenger_create_booking(quote_id uuid,request_id uuid,customer_notes text,acknowledged boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.passenger_user(); q public.passenger_quotes; fresh jsonb; v public.vehicles; customer uuid; trip uuid; result jsonb; extra uuid[];begin
 if request_id is null or acknowledged is distinct from true or length(coalesce(customer_notes,''))>4000 then raise exception 'Accept policies and check your instructions';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||request_id::text,0));
 select jsonb_agg(jsonb_build_object('id',b.id,'reference',b.reference,'status',b.status) order by b.pickup_at,b.id) into result from public.passenger_booking_accounts a join public.bookings b on b.id=a.booking_id where a.user_id=uid and a.request_key=request_id;
 if result is not null then if exists(select 1 from public.passenger_booking_accounts where user_id=uid and request_key=request_id and passenger_booking_accounts.quote_id<>passenger_create_booking.quote_id) then raise exception 'Request key already used';end if;return result;end if;
 select * into q from public.passenger_quotes where id=quote_id and user_id=uid for update;
 if not found or q.expires_at<=now() or q.consumed_key is not null then raise exception 'Quote expired. Request a fresh quote';end if;
 perform 1 from public.passenger_platform_settings s join public.business_settings b on b.organization_id=s.organization_id where s.organization_id=q.organization_id and s.bookings_enabled and b.published and b.enquiries_enabled and q.terms_snapshot=jsonb_build_object('terms',s.terms,'privacy',s.privacy_policy,'booking_policy',b.booking_policy,'cancellation_policy',b.cancellation_policy) for share of s,b;
 if not found then raise exception 'Policies changed. Request a fresh quote';end if;
 select customer_id into customer from public.passenger_profiles where user_id=uid and organization_id=q.organization_id and active for share;
 if customer is null then raise exception 'Account unavailable';end if;
 select * into v from public.vehicles where id=q.vehicle_id and organization_id=q.organization_id and public_listed and not archived and status in ('available','on_trip') for share;
 if not found or v.capacity<(q.journey->>'passengers')::integer or v.luggage_capacity is null or v.luggage_capacity<(q.journey->>'luggage')::integer or (v.registration_expiry is not null and v.registration_expiry<((q.journey->>'pickup_at')::timestamptz at time zone 'Asia/Dubai')::date) then raise exception 'Selected vehicle unavailable';end if;
 perform 1 from public.passenger_route_configuration c join public.routes r on r.id=c.route_id and r.organization_id=c.organization_id where c.organization_id=q.organization_id and c.enabled and not r.archived and r.pickup_location_id=(q.journey->>'pickup_id')::uuid and r.dropoff_location_id=(q.journey->>'dropoff_id')::uuid and (q.journey->>'end_at')::timestamptz=(q.journey->>'pickup_at')::timestamptz+make_interval(mins=>c.journey_minutes) and ((q.journey->>'return_at') is null or (q.journey->>'return_end_at')::timestamptz=(q.journey->>'return_at')::timestamptz+make_interval(mins=>c.return_minutes)) for share of c,r;
 if not found or (q.journey->>'pickup_at')::timestamptz<now()+(select make_interval(hours=>minimum_notice_hours) from public.business_settings where organization_id=q.organization_id) then raise exception 'Journey changed. Request a fresh quote';end if;
 select coalesce(array_agg(value::uuid),'{}') into extra from jsonb_array_elements_text(q.journey->'extras');
 perform 1 from public.route_pricing where id=(q.pricing->>'pricing_id')::uuid for share;
 perform 1 from public.pricing_extras where organization_id=q.organization_id and id=any(extra) order by id for share;
 fresh=public.calculate_transfer_quote(q.organization_id,(q.journey->>'pickup_id')::uuid,(q.journey->>'dropoff_id')::uuid,v.category,q.journey->>'transfer_type',extra);
 if fresh<>q.pricing then raise exception 'Pricing changed. Request a fresh quote';end if;
 insert into public.bookings(organization_id,customer_id,pickup_location_id,dropoff_location_id,pickup_at,end_at,passengers,luggage,vehicle_category,flight_number,status,price_aed,payment_status,notes)
 values(q.organization_id,customer,(q.journey->>'pickup_id')::uuid,(q.journey->>'dropoff_id')::uuid,(q.journey->>'pickup_at')::timestamptz,(q.journey->>'end_at')::timestamptz,(q.journey->>'passengers')::integer,(q.journey->>'luggage')::integer,v.category,nullif(q.journey->>'flight',''),'pending',(q.pricing->>'outbound_aed')::numeric,'unpaid',nullif(trim(customer_notes),'')) returning id into trip;
 insert into public.passenger_booking_accounts values(trip,uid,q.organization_id,request_id,q.id,now());
 if q.journey->>'transfer_type'='return' then
 insert into public.bookings(organization_id,customer_id,pickup_location_id,dropoff_location_id,pickup_at,end_at,passengers,luggage,vehicle_category,status,price_aed,payment_status,notes,return_of_booking_id)
 values(q.organization_id,customer,(q.journey->>'dropoff_id')::uuid,(q.journey->>'pickup_id')::uuid,(q.journey->>'return_at')::timestamptz,(q.journey->>'return_end_at')::timestamptz,(q.journey->>'passengers')::integer,(q.journey->>'luggage')::integer,v.category,'pending',(q.pricing->>'return_aed')::numeric,'unpaid',nullif(trim(customer_notes),''),trip) returning id into trip;
 insert into public.passenger_booking_accounts values(trip,uid,q.organization_id,request_id,q.id,now());end if;
 update public.passenger_quotes set consumed_key=request_id where id=q.id;
 select jsonb_agg(jsonb_build_object('id',b.id,'reference',b.reference,'status',b.status) order by b.pickup_at,b.id) into result from public.passenger_booking_accounts a join public.bookings b on b.id=a.booking_id where a.user_id=uid and a.request_key=request_id;
 return result;end;$$;
create function public.passenger_bookings(business_id uuid,page_number integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.passenger_user(); result jsonb;begin
 if page_number is null or page_number not between 1 and 10000 then raise exception 'Invalid page';end if;
 select coalesce(jsonb_agg(data order by pickup_at desc),'[]') into result from (select b.pickup_at,jsonb_build_object('id',b.id,'reference',b.reference,'pickup_at',b.pickup_at,'status',b.status,'price_aed',b.price_aed,'pickup',l.name,'destination',d.name) data from public.passenger_booking_accounts a join public.bookings b on b.id=a.booking_id join public.locations l on l.id=b.pickup_location_id join public.locations d on d.id=b.dropoff_location_id where a.user_id=uid and a.organization_id=business_id and private.passenger_owns(b.id) order by b.pickup_at desc limit 20 offset (page_number-1)*20) rows;
 return result;end;$$;
create function public.passenger_booking_detail(trip_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.passenger_user(); result jsonb;begin
 if not private.passenger_owns(trip_id) then raise exception 'Booking unavailable' using errcode='42501';end if;
 select jsonb_build_object('id',b.id,'reference',b.reference,'status',b.status,'pickup_at',b.pickup_at,'price_aed',b.price_aed,'pickup',l.name,'destination',d.name,'passengers',b.passengers,'luggage',b.luggage,'flight_number',b.flight_number,'flight_status',b.flight_status,'notes',b.notes,'driver',drv.name,'vehicle',v.name,'return_of_booking_id',b.return_of_booking_id,
 'policies',q.terms_snapshot,'pricing',q.pricing,'preferred_vehicle',pref.name,
 'paid_aed',coalesce((select sum(amount_aed) from public.verified_payments where booking_id=b.id and kind='charge'),0),
 'refunded_aed',coalesce((select sum(amount_aed) from public.verified_payments where booking_id=b.id and kind='refund'),0),
 'payment_state',(select status from public.payment_attempts where booking_id=b.id),
 'cancellation_request',(select status from public.passenger_cancellation_requests where booking_id=b.id),
 'timeline',coalesce((select jsonb_agg(jsonb_build_object('status',new_status,'at',created_at) order by created_at) from public.booking_status_history where booking_id=b.id),'[]'::jsonb),
 'driver_events',coalesce((select jsonb_agg(jsonb_build_object('action',event,'at',created_at) order by created_at) from public.driver_trip_events where booking_id=b.id),'[]'::jsonb)) into result
 from public.bookings b join public.passenger_booking_accounts a on a.booking_id=b.id join public.passenger_quotes q on q.id=a.quote_id join public.locations l on l.id=b.pickup_location_id join public.locations d on d.id=b.dropoff_location_id left join public.drivers drv on drv.id=b.driver_id left join public.vehicles v on v.id=b.vehicle_id left join public.vehicles pref on pref.id=q.vehicle_id where b.id=trip_id;
 return result;end;$$;
create function public.passenger_request_cancellation(trip_id uuid,reason_text text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.passenger_user();begin
 perform 1 from public.bookings where id=trip_id for update;
 if not private.passenger_owns(trip_id) or not exists(select 1 from public.bookings where id=trip_id and status in ('pending','confirmed') and not archived) then raise exception 'Cancellation request unavailable' using errcode='42501';end if;
 insert into public.passenger_cancellation_requests(booking_id,user_id,reason) values(trip_id,uid,trim(reason_text)) on conflict(booking_id) do nothing;
 -- This is a request, never automatic cancellation or refund.
 end;$$;
-- Automatic passenger tracking is based on the immutable verified booking relationship, not email matching.
create or replace function private.can_track(trip uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.bookings b where b.id=trip and exists(select 1 from auth.users u where u.id=auth.uid() and u.deleted_at is null and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<=now())) and (
 exists(select 1 from public.staff_members m where m.user_id=auth.uid() and m.active and m.organization_id=b.organization_id and m.role in ('owner','manager','dispatcher','viewer'))
 or (b.driver_id=private.assigned_driver_id() and b.status in ('confirmed','in_progress') and not b.archived)
 or (not exists(select 1 from public.staff_members m where m.user_id=auth.uid() and m.role='driver') and exists(select 1 from public.passenger_tracking_access a where a.booking_id=b.id and a.user_id=auth.uid() and not a.revoked and a.expires_at>now()))
 or (private.passenger_owns(b.id) and b.status in ('confirmed','in_progress') and not b.archived and now()<b.end_at+interval '2 hours')
 ));$$;
-- Event outbox contains IDs only; addresses and booking details are resolved at authorized delivery time.
create function private.passenger_notice(trip uuid,event_kind text,event_key text) returns void language sql security definer set search_path='' as $$
 insert into public.passenger_notification_outbox(user_id,booking_id,kind,dedupe_key) select user_id,booking_id,event_kind,event_key from public.passenger_booking_accounts where booking_id=trip on conflict(dedupe_key) do nothing;$$;
create function private.passenger_booking_linked() returns trigger language plpgsql security definer set search_path='' as $$begin perform private.passenger_notice(new.booking_id,'booking_requested','request:'||new.booking_id);return new;end;$$;
create trigger passenger_booking_linked after insert on public.passenger_booking_accounts for each row execute function private.passenger_booking_linked();
create function private.passenger_booking_changed() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status is distinct from old.status then perform private.passenger_notice(new.id,'booking_'||new.status,'status:'||new.id||':'||new.status);end if;
 if new.driver_id is distinct from old.driver_id and new.driver_id is not null then perform private.passenger_notice(new.id,'driver_assigned','assignment:'||new.id||':'||new.driver_id||':'||new.updated_at);end if;
 return new;end;$$;
create trigger passenger_booking_changed after update on public.bookings for each row execute function private.passenger_booking_changed();
create function private.passenger_driver_notice() returns trigger language plpgsql security definer set search_path='' as $$begin perform private.passenger_notice(new.booking_id,'driver_'||new.event,'driver-event:'||new.id);return new;end;$$;
create trigger passenger_driver_notice after insert on public.driver_trip_events for each row execute function private.passenger_driver_notice();
create function public.passenger_notifications() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.passenger_user();begin return coalesce((select jsonb_agg(jsonb_build_object('kind',n.kind,'at',n.created_at,'reference',b.reference,'booking_id',b.id,'email_status',n.status) order by n.created_at desc) from (select * from public.passenger_notification_outbox where user_id=uid order by created_at desc limit 50) n join public.bookings b on b.id=n.booking_id where private.passenger_owns(b.id)),'[]'::jsonb);end;$$;
create function public.admin_passenger_configuration() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if private.current_role() not in ('owner','manager') or private.current_role() is null then raise exception 'Not permitted' using errcode='42501';end if;
 return jsonb_build_object('settings',(select to_jsonb(s) from public.passenger_platform_settings s where organization_id=private.organization_id()),'routes',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'minutes',c.journey_minutes,'return_minutes',c.return_minutes,'enabled',coalesce(c.enabled,false))) from public.routes r left join public.passenger_route_configuration c on c.route_id=r.id where r.organization_id=private.organization_id() and not r.archived),'[]'::jsonb));end;$$;
create function public.admin_passenger_settings(enabled boolean,privacy text,terms_text text) returns void language plpgsql security definer set search_path='' as $$begin
 if private.current_role() is distinct from 'owner' then raise exception 'Only Owner may enable booking policies' using errcode='42501';end if;
 if enabled and (length(trim(coalesce(privacy,'')))=0 or length(trim(coalesce(terms_text,'')))=0) then raise exception 'Published policies required';end if;
 insert into public.passenger_platform_settings values(private.organization_id(),enabled,privacy,terms_text,now()) on conflict(organization_id) do update set bookings_enabled=excluded.bookings_enabled,privacy_policy=excluded.privacy_policy,terms=excluded.terms,updated_at=now();end;$$;
create function public.admin_passenger_route(route uuid,minutes integer,return_duration integer,enabled boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if private.current_role() not in ('owner','manager') or private.current_role() is null then raise exception 'Not permitted' using errcode='42501';end if;
 if not exists(select 1 from public.routes where id=route and organization_id=private.organization_id() and not archived) then raise exception 'Route unavailable';end if;
 insert into public.passenger_route_configuration values(private.organization_id(),route,minutes,return_duration,enabled) on conflict(route_id) do update set journey_minutes=excluded.journey_minutes,return_minutes=excluded.return_minutes,enabled=excluded.enabled;end;$$;
-- Fixed read-only concierge context; no arbitrary SQL, contacts, GPS or private prompts in storage.
create function public.concierge_context(business_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('public',public.website_content(business_id),'fares',coalesce((select jsonb_agg(jsonb_build_object('pickup',l.name,'destination',d.name,'category',p.vehicle_category,'base_aed',p.price_aed,'fees_aed',p.additional_charges_aed,'return_base_aed',p.return_fare_aed)) from public.route_pricing p join public.locations l on l.id=p.pickup_location_id and l.public_listed and not l.archived join public.locations d on d.id=p.dropoff_location_id and d.public_listed and not d.archived join public.routes r on r.id=p.route_id and not r.archived where p.organization_id=business_id and p.public_listed and not p.archived and exists(select 1 from public.business_settings where organization_id=business_id and published and enquiries_enabled)),'[]'::jsonb));$$;
create function public.concierge_consume(subject text,business_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare bucket timestamptz:=date_trunc('hour',now()); used_count integer;begin
 if subject !~ '^[a-f0-9]{64}$' then raise exception 'Invalid subject';end if;
 -- Lock both limits before consuming; only trusted server may invoke.
 perform pg_advisory_xact_lock(hashtextextended(business_id::text||bucket::text,0));
 select used into used_count from public.concierge_usage where subject_hash=encode(extensions.digest(business_id::text,'sha256'),'hex') and window_start=bucket;
 if coalesce(used_count,0)>=200 then return false;end if;
 select used into used_count from public.concierge_usage where subject_hash=subject and window_start=bucket;
 if coalesce(used_count,0)>=10 then return false;end if;
 insert into public.concierge_usage values(subject,bucket,1) on conflict(subject_hash,window_start) do update set used=public.concierge_usage.used+1;
 insert into public.concierge_usage values(encode(extensions.digest(business_id::text,'sha256'),'hex'),bucket,1) on conflict(subject_hash,window_start) do update set used=public.concierge_usage.used+1;
 delete from public.concierge_usage where window_start<now()-interval '48 hours';return true;end;$$;
-- Trusted payment operations. No public client can supply provider evidence.
create function public.payment_reserve(trip uuid,passenger uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.bookings; attempt public.payment_attempts;begin
 select * into b from public.bookings where id=trip for update;
 if not found or b.status<>'confirmed' or b.archived or b.price_aed<=0 or b.price_aed>10000000 or not exists(select 1 from public.passenger_booking_accounts a join public.passenger_profiles p on p.user_id=a.user_id and p.organization_id=a.organization_id and p.active join auth.users u on u.id=a.user_id where a.booking_id=trip and a.user_id=passenger and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and not exists(select 1 from public.staff_members m where m.user_id=passenger)) then raise exception 'Payment unavailable' using errcode='42501';end if;
 if exists(select 1 from public.verified_payments where booking_id=trip) then raise exception 'Payment already recorded. Contact our team';end if;
 insert into public.payment_attempts(booking_id,organization_id,user_id,amount_minor) values(trip,b.organization_id,passenger,(b.price_aed*100)::bigint) on conflict(booking_id) do nothing;
 select * into attempt from public.payment_attempts where booking_id=trip;
 if attempt.status not in ('creating','open') then raise exception 'Payment requires reconciliation';end if;
 return to_jsonb(attempt)||jsonb_build_object('reference',b.reference);end;$$;
create function public.payment_attach(attempt uuid,session text) returns void language plpgsql security definer set search_path='' as $$begin
 update public.payment_attempts set session_id=session,status='open' where id=attempt and status in ('creating','open') and (session_id is null or session_id=session);
 if not found then raise exception 'Payment session mismatch';end if;end;$$;
create function private.payment_booking_lock() returns trigger language plpgsql security definer set search_path='' as $$begin
 if (new.price_aed is distinct from old.price_aed or new.customer_id is distinct from old.customer_id or new.organization_id is distinct from old.organization_id) and exists(select 1 from public.payment_attempts where booking_id=new.id) then raise exception 'Payment already initiated; reconcile before changing amount or customer';end if;return new;end;$$;
create trigger payment_booking_lock before update on public.bookings for each row execute function private.payment_booking_lock();
create function public.payment_record(event_key text,event_kind text,attempt uuid,session text,intent text,charge text,total_minor bigint,currency_code text,refund_total bigint default 0) returns boolean language plpgsql security definer set search_path='' as $$
declare p public.payment_attempts; delta bigint;begin
 select * into p from public.payment_attempts where id=attempt for update;
 if not found or currency_code is distinct from 'aed' or total_minor is null or session is null or refund_total is null or total_minor<>p.amount_minor or session is distinct from p.session_id or length(coalesce(intent,''))=0 or length(coalesce(charge,''))=0 or (p.payment_intent_id is not null and p.payment_intent_id<>intent) or (p.charge_id is not null and p.charge_id<>charge) or refund_total<0 or refund_total>total_minor then raise exception 'Provider evidence mismatch';end if;
 if exists(select 1 from public.payment_webhook_events where event_id=event_key) then return false;end if;
 if event_kind is null or event_kind not in ('paid','refund') then raise exception 'Unsupported event';end if;
 insert into public.payment_webhook_events values(event_key,event_kind,attempt,now());
 if event_kind in ('paid','refund') then
 if not exists(select 1 from public.verified_payments where provider='stripe' and provider_event_id='charge:'||charge) then
 insert into public.verified_payments(organization_id,booking_id,provider,provider_event_id,kind,amount_aed,currency,verified_at) values(p.organization_id,p.booking_id,'stripe','charge:'||charge,'charge',total_minor/100.0,'AED',now());
 perform private.passenger_notice(p.booking_id,'payment_confirmed','payment:'||charge);end if;
 delta=refund_total-p.refunded_minor;
 if delta>0 then insert into public.verified_payments(organization_id,booking_id,provider,provider_event_id,kind,amount_aed,currency,verified_at) values(p.organization_id,p.booking_id,'stripe',event_key,'refund',delta/100.0,'AED',now());end if;
 update public.payment_attempts set status=case when greatest(refund_total,p.refunded_minor)=p.amount_minor then 'refunded' else 'paid' end,payment_intent_id=intent,charge_id=charge,refunded_minor=greatest(refund_total,p.refunded_minor) where id=attempt;
 else if p.status not in ('paid','refunded') then update public.payment_attempts set status='failed' where id=attempt;perform private.passenger_notice(p.booking_id,'payment_failed','failed:'||attempt);end if;end if;
 return true;end;$$;
create function public.notification_claim() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 with due as (select n.id from public.passenger_notification_outbox n join public.passenger_profiles p on p.user_id=n.user_id and p.active join public.passenger_booking_accounts a on a.booking_id=n.booking_id and a.user_id=p.user_id and a.organization_id=p.organization_id join auth.users u on u.id=p.user_id and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) where n.status in ('queued','sending') and n.attempts<5 and n.next_attempt_at<=now() and (n.leased_until is null or n.leased_until<now()) order by n.created_at limit 10 for update of n skip locked), claimed as (update public.passenger_notification_outbox n set status='sending',attempts=n.attempts+1,leased_until=now()+interval '5 minutes',lease_token=gen_random_uuid() from due where n.id=due.id returning n.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'booking_id',n.booking_id,'lease',n.lease_token,'kind',n.kind,'email',u.email,'reference',b.reference,'attempt',n.attempts)),'[]'::jsonb) into result from claimed n join auth.users u on u.id=n.user_id join public.bookings b on b.id=n.booking_id;
 return result;end;$$;
create function public.notification_result(notification uuid,provider_message text,was_accepted boolean,lease uuid) returns void language plpgsql security definer set search_path='' as $$begin
 update public.passenger_notification_outbox set provider_id=case when was_accepted then provider_message else provider_id end,status=case when was_accepted then 'accepted' when attempts>=5 then 'failed' else 'queued' end,next_attempt_at=now()+interval '15 minutes',leased_until=null where id=notification and status='sending' and lease_token=lease;end;$$;
create function public.notification_delivered(provider_message text,event_type text) returns boolean language plpgsql security definer set search_path='' as $$begin
 if event_type='email.delivered' then update public.passenger_notification_outbox set status='delivered',delivered_at=coalesce(delivered_at,now()) where provider_id=provider_message;
 elsif event_type in ('email.bounced','email.failed') then update public.passenger_notification_outbox set status='failed' where provider_id=provider_message and status<>'delivered';end if;return exists(select 1 from public.passenger_notification_outbox where provider_id=provider_message);end;$$;
create function public.payment_failed(event_key text,attempt uuid,session text) returns void language plpgsql security definer set search_path='' as $$declare p public.payment_attempts;begin
 select * into p from public.payment_attempts where id=attempt for update;
 if not found or session is distinct from p.session_id then raise exception 'Provider evidence mismatch';end if;
 insert into public.payment_webhook_events values(event_key,'failed',attempt,now()) on conflict(event_id) do nothing;
 if not found then return;end if;
 if p.status not in ('paid','refunded') then update public.payment_attempts set status='failed' where id=attempt;perform private.passenger_notice(p.booking_id,'payment_failed','failed:'||attempt);end if;end;$$;
create function public.admin_passenger_booking(trip uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if private.current_role() is null or private.current_role() not in ('owner','manager','dispatcher','viewer') then raise exception 'Not permitted' using errcode='42501';end if;
 select jsonb_build_object('preferred_vehicle',(select v.name from public.passenger_booking_accounts a join public.passenger_quotes q on q.id=a.quote_id join public.vehicles v on v.id=q.vehicle_id where a.booking_id=b.id),
 'paid_aed',coalesce((select sum(amount_aed) from public.verified_payments where booking_id=b.id and kind='charge'),0),'refunded_aed',coalesce((select sum(amount_aed) from public.verified_payments where booking_id=b.id and kind='refund'),0),
 'payment',(select jsonb_build_object('status',p.status,'amount_minor',p.amount_minor,'session_id',p.session_id,'payment_intent_id',p.payment_intent_id) from public.payment_attempts p where p.booking_id=b.id),
 'cancellation',(select jsonb_build_object('reason',c.reason,'status',c.status) from public.passenger_cancellation_requests c where c.booking_id=b.id)) into result from public.bookings b where b.id=trip and b.organization_id=private.organization_id();
 if result is null then raise exception 'Booking unavailable' using errcode='42501';end if;return result;end;$$;
create function public.admin_review_cancellation(trip uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if private.current_role() is null or private.current_role() not in ('owner','manager','dispatcher') or not exists(select 1 from public.bookings where id=trip and organization_id=private.organization_id()) then raise exception 'Not permitted' using errcode='42501';end if;
 update public.passenger_cancellation_requests set status='reviewed' where booking_id=trip and status='requested';
 if found then insert into public.audit_events(organization_id,actor_id,table_name,record_id,operation,changed_fields) values(private.organization_id(),auth.uid(),'passenger_cancellation_requests',trip::text,'UPDATE',array['status']);end if;end;$$;
-- Explicit grants, no DEFAULT PUBLIC execution on any new function.
do $$declare f record;begin for f in select p.oid::regprocedure signature,n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname in ('passenger_user','passenger_owns','passenger_save_profile','passenger_profile','passenger_booking_configuration','passenger_quote','passenger_create_booking','passenger_bookings','passenger_booking_detail','passenger_request_cancellation','passenger_notice','passenger_booking_linked','passenger_booking_changed','passenger_driver_notice','passenger_notifications','admin_passenger_configuration','admin_passenger_settings','admin_passenger_route','concierge_context','concierge_consume','payment_reserve','payment_attach','payment_booking_lock','payment_record','payment_failed','notification_claim','notification_result','notification_delivered','admin_passenger_booking','admin_review_cancellation') loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);end loop;end$$;
grant execute on function private.passenger_owns(uuid),public.passenger_save_profile(uuid,text,text),public.passenger_profile(uuid),public.passenger_quote(uuid,uuid,jsonb),public.passenger_create_booking(uuid,uuid,text,boolean),public.passenger_bookings(uuid,integer),public.passenger_booking_detail(uuid),public.passenger_request_cancellation(uuid,text),public.passenger_notifications(),public.admin_passenger_booking(uuid),public.admin_review_cancellation(uuid),public.admin_passenger_configuration(),public.admin_passenger_settings(boolean,text,text),public.admin_passenger_route(uuid,integer,integer,boolean) to authenticated;
grant execute on function public.passenger_booking_configuration(uuid),public.concierge_context(uuid) to anon,authenticated,service_role;
grant execute on function public.concierge_consume(text,uuid),public.payment_reserve(uuid,uuid),public.payment_attach(uuid,text),public.payment_failed(text,uuid,text),public.payment_record(text,text,uuid,text,text,text,bigint,text,bigint),public.notification_claim(),public.notification_result(uuid,text,boolean,uuid),public.notification_delivered(text,text) to service_role;
grant select on public.payment_attempts to service_role;
notify pgrst,'reload schema';
commit;
