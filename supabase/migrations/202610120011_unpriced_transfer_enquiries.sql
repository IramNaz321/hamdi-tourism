begin;
do $$begin
 if to_regclass('public.business_settings') is null
  or to_regclass('public.booking_enquiries') is null
  or to_regclass('public.unpriced_transfer_enquiries') is not null then
  raise exception 'Expected completed business-system baseline with no unpriced enquiry table';
 end if;
end;$$;

create table public.unpriced_transfer_enquiries (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 reference text not null default ('HM-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 name text not null check (length(trim(name)) between 1 and 200),
 email text not null check (length(email) between 3 and 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 phone text not null check (length(trim(phone)) between 7 and 100),
 pickup_location_id uuid not null,
 dropoff_location_id uuid not null,
 pickup_address text check (length(pickup_address)<=500),
 dropoff_address text check (length(dropoff_address)<=500),
 pickup_at timestamptz not null,
 return_at timestamptz,
 passengers integer not null check (passengers between 1 and 1000),
 luggage integer not null check (luggage between 0 and 1000),
 vehicle_category text not null check (vehicle_category in ('sedan','suv','van','luxury')),
 transfer_type text not null check (transfer_type in ('one_way','return')),
 flight_number text check (length(flight_number)<=200),
 notes text check (length(notes)<=4000),
 status text not null default 'new' check (status in ('new','reviewed','closed')),
 archived boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (organization_id,id),
 unique (organization_id,reference),
 foreign key (organization_id,pickup_location_id) references public.locations(organization_id,id),
 foreign key (organization_id,dropoff_location_id) references public.locations(organization_id,id),
 check (pickup_location_id<>dropoff_location_id),
 check ((transfer_type='one_way' and return_at is null) or (transfer_type='return' and return_at>pickup_at))
);
create index unpriced_enquiry_org_time_idx
 on public.unpriced_transfer_enquiries(organization_id,created_at desc);
create index unpriced_enquiry_rate_idx
 on public.unpriced_transfer_enquiries(organization_id,email,created_at);
alter table public.unpriced_transfer_enquiries enable row level security;
revoke all on public.unpriced_transfer_enquiries from public,anon,authenticated,service_role;
create policy unpriced_enquiry_read on public.unpriced_transfer_enquiries
 for select to authenticated using
 (organization_id=(select private.organization_id()) and (select private.current_role()) in ('owner','manager','dispatcher','viewer'));
create policy unpriced_enquiry_update on public.unpriced_transfer_enquiries
 for update to authenticated using
 (organization_id=(select private.organization_id()) and (select private.current_role()) in ('owner','manager','dispatcher'))
 with check
 (organization_id=(select private.organization_id()) and (select private.current_role()) in ('owner','manager','dispatcher'));
grant select on public.unpriced_transfer_enquiries to authenticated;
grant update(status) on public.unpriced_transfer_enquiries to authenticated;
grant select,insert on public.unpriced_transfer_enquiries to service_role;
create trigger prepare_unpriced_enquiry before update on public.unpriced_transfer_enquiries
 for each row execute function private.prepare_record();
create trigger audit_unpriced_enquiry after insert or update on public.unpriced_transfer_enquiries
 for each row execute function private.audit_change();

create function public.submit_unpriced_transfer_enquiry(
 business_id uuid,customer_name text,customer_email text,customer_phone text,
 pickup_id uuid,dropoff_id uuid,pickup_address text,dropoff_address text,
 pickup_time timestamptz,return_time timestamptz,passenger_count integer,luggage_count integer,
 category text,transfer_kind text,flight text,customer_notes text
) returns text language plpgsql security definer set search_path='' as $$
declare ref text;notice_hours integer;
begin
 perform 1 from public.organizations where id=business_id for update;
 if not found then raise exception 'Online enquiries are unavailable';end if;
 select minimum_notice_hours into notice_hours from public.business_settings
 where organization_id=business_id and published and enquiries_enabled for share;
 if not found then raise exception 'Online enquiries are unavailable';end if;
 if customer_name is null or length(trim(customer_name)) not between 1 and 200
  or customer_email is null or length(trim(customer_email)) not between 3 and 254
  or customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  or customer_phone is null or length(trim(customer_phone)) not between 7 and 100
  or passenger_count is null or passenger_count not between 1 and 1000
  or luggage_count is null or luggage_count not between 0 and 1000
  or category is null or category not in ('sedan','suv','van','luxury')
  or transfer_kind is null or transfer_kind not in ('one_way','return')
  or length(coalesce(flight,''))>200 or length(coalesce(customer_notes,''))>4000
  or length(coalesce(pickup_address,''))>500 or length(coalesce(dropoff_address,''))>500 then
  raise exception 'Check your contact, journey and passenger details';
 end if;
 if pickup_time is null or pickup_time<now()+make_interval(hours=>notice_hours)
  or (transfer_kind='return' and (return_time is null or return_time<=pickup_time))
  or (transfer_kind='one_way' and return_time is not null) then
  raise exception 'Check your pickup and return times';
 end if;
 if pickup_id is null or dropoff_id is null or pickup_id=dropoff_id
  or (select count(*) from public.locations where organization_id=business_id
   and id in (pickup_id,dropoff_id) and public_listed and not archived)<>2 then
  raise exception 'Choose published locations';
 end if;
 if (select count(*) from public.unpriced_transfer_enquiries
   where organization_id=business_id and created_at>now()-interval '1 hour')>=100
  or (select count(*) from public.unpriced_transfer_enquiries
   where organization_id=business_id and email=lower(trim(customer_email))
   and created_at>now()-interval '1 hour')>=3 then
  raise exception 'Please contact our team to continue your enquiry';
 end if;
 insert into public.unpriced_transfer_enquiries
  (organization_id,name,email,phone,pickup_location_id,dropoff_location_id,pickup_address,
   dropoff_address,pickup_at,return_at,passengers,luggage,vehicle_category,transfer_type,
   flight_number,notes)
 values
  (business_id,trim(customer_name),lower(trim(customer_email)),trim(customer_phone),
   pickup_id,dropoff_id,nullif(trim(pickup_address),''),nullif(trim(dropoff_address),''),
   pickup_time,return_time,passenger_count,luggage_count,category,transfer_kind,
   nullif(trim(flight),''),nullif(trim(customer_notes),'')) returning reference into ref;
 return ref;
end;$$;
revoke all on function public.submit_unpriced_transfer_enquiry(uuid,text,text,text,uuid,uuid,text,text,timestamptz,timestamptz,integer,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_unpriced_transfer_enquiry(uuid,text,text,text,uuid,uuid,text,text,timestamptz,timestamptz,integer,integer,text,text,text,text) to service_role;
commit;
