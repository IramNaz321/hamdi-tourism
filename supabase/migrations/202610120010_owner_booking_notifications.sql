begin;
do $$begin
 if to_regclass('public.passenger_profiles') is null
  or to_regclass('public.passenger_notification_outbox') is null
  or to_regclass('public.owner_booking_notification_outbox') is not null then
  raise exception 'Expected completed 001-009 baseline with no owner-notification objects';
 end if;
end;$$;

create table public.owner_booking_notification_outbox (
 booking_id uuid primary key references public.bookings(id),
 reference text not null,
 pickup_name text not null,
 dropoff_name text not null,
 customer_name text,
 customer_email text,
 customer_phone text,
 pickup_at timestamptz not null,
 passengers integer not null check(passengers between 1 and 1000),
 luggage integer check(luggage between 0 and 1000),
 vehicle_category text check(vehicle_category in ('sedan','suv','van','luxury')),
 price_aed numeric(12,2) not null check(price_aed between 0 and 10000000),
 payment_status text not null check(payment_status in ('unpaid','paid','refunded')),
 flight_number text,
 status text not null default 'queued' check(status in ('queued','sending','accepted','delivered','failed')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 next_attempt_at timestamptz not null default now(),
 first_attempt_at timestamptz,
 leased_until timestamptz,
 lease_token uuid,
 provider_id text unique,
 created_at timestamptz not null default now(),
 delivered_at timestamptz,
 check (status not in ('queued','sending') or (customer_name is not null and customer_phone is not null))
);
create index owner_booking_notification_due on public.owner_booking_notification_outbox(next_attempt_at)
 where status in ('queued','sending');
alter table public.owner_booking_notification_outbox enable row level security;
revoke all on public.owner_booking_notification_outbox from public,anon,authenticated,service_role;

create function private.owner_booking_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare pickup text; destination text; customer record;
begin
 select l.name into strict pickup from public.locations l
 where l.id=new.pickup_location_id and l.organization_id=new.organization_id;
 select l.name into strict destination from public.locations l
 where l.id=new.dropoff_location_id and l.organization_id=new.organization_id;
 select c.name,c.email,c.phone into strict customer from public.customers c
 where c.id=new.customer_id and c.organization_id=new.organization_id;
 insert into public.owner_booking_notification_outbox
  (booking_id,reference,pickup_name,dropoff_name,customer_name,customer_email,customer_phone,
   pickup_at,passengers,luggage,vehicle_category,price_aed,payment_status,flight_number)
 values(new.id,new.reference,pickup,destination,customer.name,customer.email,customer.phone,
   new.pickup_at,new.passengers,new.luggage,new.vehicle_category,new.price_aed,new.payment_status,new.flight_number);
 return new;
end;$$;
create trigger owner_booking_notice after insert on public.bookings
 for each row execute function private.owner_booking_notice();
revoke all on function private.owner_booking_notice() from public,anon,authenticated,service_role;

create function public.owner_notification_claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 -- Expired final leases must terminate and purge contacts, rather than strand sending rows.
 update public.owner_booking_notification_outbox set status='failed',leased_until=null,
  customer_name=null,customer_email=null,customer_phone=null
 where status in ('queued','sending') and (attempts>=5 or first_attempt_at<=now()-interval '23 hours')
  and (leased_until is null or leased_until<now());
 with due as (
  select n.booking_id from public.owner_booking_notification_outbox n
  where n.status in ('queued','sending') and n.attempts<5 and n.next_attempt_at<=now()
   and (n.leased_until is null or n.leased_until<now())
  order by n.created_at limit 10 for update skip locked
 ), claimed as (
  update public.owner_booking_notification_outbox n set status='sending',attempts=n.attempts+1,
   leased_until=now()+interval '5 minutes',lease_token=gen_random_uuid(),first_attempt_at=coalesce(n.first_attempt_at,now())
  from due where n.booking_id=due.booking_id returning n.*
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',n.booking_id,'booking_id',n.booking_id,'lease',n.lease_token,'reference',n.reference,
  'pickup_name',n.pickup_name,'dropoff_name',n.dropoff_name,'pickup_at',n.pickup_at,
  'customer_name',n.customer_name,'customer_email',n.customer_email,'customer_phone',n.customer_phone,
  'passengers',n.passengers,'luggage',n.luggage,'vehicle_category',n.vehicle_category,
  'price_aed',n.price_aed,'payment_status',n.payment_status,
  'flight_number',n.flight_number,'attempt',n.attempts
 )),'[]'::jsonb) into result from claimed n;
 return result;
end;$$;
create function public.owner_notification_result(notification uuid,provider_message text,was_accepted boolean,lease uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if was_accepted and length(trim(coalesce(provider_message,'')))=0 then raise exception 'Provider message ID required';end if;
 update public.owner_booking_notification_outbox set
  provider_id=case when was_accepted then provider_message else provider_id end,
  status=case when was_accepted then 'accepted' when attempts>=5 then 'failed' else 'queued' end,
  next_attempt_at=now()+interval '15 minutes',leased_until=null,
  customer_name=case when was_accepted or attempts>=5 then null else customer_name end,
  customer_email=case when was_accepted or attempts>=5 then null else customer_email end,
  customer_phone=case when was_accepted or attempts>=5 then null else customer_phone end
 where booking_id=notification and status='sending' and lease_token=lease;
 if not found then raise exception 'Notification lease expired';end if;
end;$$;
create function public.owner_notification_delivered(provider_message text,event_type text) returns boolean language plpgsql security definer set search_path='' as $$begin
 if event_type='email.delivered' then
  update public.owner_booking_notification_outbox set status='delivered',delivered_at=coalesce(delivered_at,now())
  where provider_id=provider_message;
 elsif event_type in ('email.bounced','email.failed') then
  update public.owner_booking_notification_outbox set status='failed'
  where provider_id=provider_message and status<>'delivered';
 else
  return exists(select 1 from public.owner_booking_notification_outbox where provider_id=provider_message);
 end if;
 return exists(select 1 from public.owner_booking_notification_outbox where provider_id=provider_message);
end;$$;
revoke all on function public.owner_notification_claim() from public,anon,authenticated;
revoke all on function public.owner_notification_result(uuid,text,boolean,uuid) from public,anon,authenticated;
revoke all on function public.owner_notification_delivered(text,text) from public,anon,authenticated;
grant execute on function public.owner_notification_claim() to service_role;
grant execute on function public.owner_notification_result(uuid,text,boolean,uuid) to service_role;
grant execute on function public.owner_notification_delivered(text,text) to service_role;
commit;
