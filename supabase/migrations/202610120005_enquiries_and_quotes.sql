begin;
create function public.calculate_transfer_quote(business_id uuid,pickup_id uuid,dropoff_id uuid,category text,transfer_kind text,extra_ids uuid[] default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.route_pricing; extra_out numeric:=0; extra_back numeric:=0; count_extras integer; outbound numeric; inbound numeric;
begin
 if not exists(select 1 from public.business_settings where organization_id=business_id and published and enquiries_enabled) then raise exception 'Online enquiries are unavailable'; end if;
 if transfer_kind is null or transfer_kind not in ('one_way','return') or category is null or category not in ('sedan','suv','van','luxury') or pickup_id=dropoff_id or extra_ids is null or cardinality(extra_ids)>20 then raise exception 'Check your journey details'; end if;
 if (select count(*) from public.locations where organization_id=business_id and id in (pickup_id,dropoff_id) and public_listed and not archived)<>2 then raise exception 'Choose published locations'; end if;
 select rp.* into p from public.route_pricing rp join public.routes r on r.id=rp.route_id and r.organization_id=rp.organization_id
 where rp.organization_id=business_id and rp.pickup_location_id=pickup_id and rp.dropoff_location_id=dropoff_id and rp.vehicle_category=category and rp.public_listed and not rp.archived and not r.archived;
 if not found then raise exception 'A quote is not available for this route and category'; end if;
 if transfer_kind='return' and p.return_fare_aed is null then raise exception 'Return pricing is not available for this route'; end if;
 select count(*),coalesce(sum(price_aed),0),coalesce(sum(price_aed) filter(where charge_basis='per_leg'),0) into count_extras,extra_out,extra_back
 from public.pricing_extras where organization_id=business_id and route_pricing_id=p.id and not archived and id=any(extra_ids);
 if count_extras<>cardinality(extra_ids) then raise exception 'Choose valid optional extras'; end if;
 outbound=p.price_aed+p.additional_charges_aed+extra_out;
 inbound=case when transfer_kind='return' then p.return_fare_aed+p.additional_charges_aed+extra_back else null end;
 return jsonb_build_object('pricing_id',p.id,'currency','AED','base_fare',p.price_aed,'additional_charges',p.additional_charges_aed,'outbound_aed',outbound,'return_aed',inbound,'total_aed',outbound+coalesce(inbound,0),'extras',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'price_aed',price_aed,'charge_basis',charge_basis) order by name) from public.pricing_extras where organization_id=business_id and route_pricing_id=p.id and not archived),'[]'::jsonb));
end; $$;
revoke all on function public.calculate_transfer_quote(uuid,uuid,uuid,text,text,uuid[]) from public;
grant execute on function public.calculate_transfer_quote(uuid,uuid,uuid,text,text,uuid[]) to anon,authenticated,service_role;

create function public.submit_booking_enquiry(business_id uuid,customer_name text,customer_email text,customer_phone text,pickup_id uuid,dropoff_id uuid,pickup_time timestamptz,return_time timestamptz,passenger_count integer,luggage_count integer,category text,transfer_kind text,flight text,customer_notes text,extra_ids uuid[],expected_total numeric) returns text
language plpgsql security definer set search_path='' as $$
declare q jsonb; ref text; notice_hours integer;
begin
 -- Service-role-only RPC. The Next.js action validates CAPTCHA before invoking this function.
 -- Serialize quotes/submissions and rate-limit server-verified enquiries per business/email.
 perform 1 from public.organizations where id=business_id for update;
 select minimum_notice_hours into notice_hours from public.business_settings where organization_id=business_id and published and enquiries_enabled for share;
 if not found then raise exception 'Online enquiries are unavailable'; end if;
 if customer_name is null or length(trim(customer_name)) not between 1 and 200 or customer_email is null or length(customer_email)>254 or customer_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or customer_phone is null or length(trim(customer_phone)) not between 7 and 100 or passenger_count is null or passenger_count not between 1 and 1000 or luggage_count is null or luggage_count not between 0 and 1000 or length(flight)>200 or length(customer_notes)>4000 then raise exception 'Check your contact and passenger details'; end if;
 if pickup_time is null or pickup_time<now()+make_interval(hours=>notice_hours) or (transfer_kind='return' and (return_time is null or return_time<=pickup_time)) or (transfer_kind='one_way' and return_time is not null) then raise exception 'Check your pickup and return times'; end if;
 if (select count(*) from public.booking_enquiries where organization_id=business_id and created_at>now()-interval '1 hour')>=100 or (select count(*) from public.booking_enquiries where organization_id=business_id and email=lower(trim(customer_email)) and created_at>now()-interval '1 hour')>=3 then raise exception 'Please contact our team to continue your enquiry'; end if;
 -- Lock the price and extras to keep the quote snapshot consistent with the submitted records.
 perform 1 from public.route_pricing where organization_id=business_id and pickup_location_id=pickup_id and dropoff_location_id=dropoff_id and vehicle_category=category for share;
 perform 1 from public.pricing_extras where organization_id=business_id and id=any(extra_ids) order by id for share;
 q=public.calculate_transfer_quote(business_id,pickup_id,dropoff_id,category,transfer_kind,extra_ids);
 if expected_total is null or (q->>'total_aed')::numeric<>expected_total then raise exception 'Pricing changed. Please request a fresh quote'; end if;
 insert into public.booking_enquiries(organization_id,name,email,phone,pickup_location_id,dropoff_location_id,pickup_at,return_at,passengers,luggage,vehicle_category,transfer_type,flight_number,notes,extras,quoted_outbound_aed,quoted_return_aed,pricing_snapshot)
 values(business_id,trim(customer_name),lower(trim(customer_email)),trim(customer_phone),pickup_id,dropoff_id,pickup_time,return_time,passenger_count,luggage_count,category,transfer_kind,nullif(trim(flight),''),nullif(trim(customer_notes),''),extra_ids,(q->>'outbound_aed')::numeric,(q->>'return_aed')::numeric,q) returning reference into ref;
 return ref;
end; $$;
revoke all on function public.submit_booking_enquiry(uuid,text,text,text,uuid,uuid,timestamptz,timestamptz,integer,integer,text,text,text,text,uuid[],numeric) from public,anon,authenticated;
grant execute on function public.submit_booking_enquiry(uuid,text,text,text,uuid,uuid,timestamptz,timestamptz,integer,integer,text,text,text,text,uuid[],numeric) to service_role;

create function public.convert_booking_enquiry(target_enquiry_id uuid,outbound_end timestamptz,return_end timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare org uuid; enquiry public.booking_enquiries; customer uuid; booking uuid;
begin
 org=private.organization_id();
 if private.current_role() is null or private.current_role() not in ('owner','manager','dispatcher') then raise exception 'Not permitted'; end if;
 select * into enquiry from public.booking_enquiries where id=target_enquiry_id and organization_id=org for update;
 if not found or enquiry.status not in ('new','reviewed') then raise exception 'This enquiry cannot be converted'; end if;
 if outbound_end is null or outbound_end<=enquiry.pickup_at or (enquiry.transfer_type='return' and (return_end is null or return_end<=enquiry.return_at or enquiry.return_at<=outbound_end)) or (enquiry.transfer_type='one_way' and return_end is not null) then raise exception 'Enter valid journey end times'; end if;
 -- Contact details originate from this genuine enquiry. Do not silently merge people with similar names.
 insert into public.customers(organization_id,name,email,phone) values(org,enquiry.name,enquiry.email,enquiry.phone) returning id into customer;
 insert into public.bookings(organization_id,customer_id,pickup_location_id,dropoff_location_id,pickup_at,end_at,passengers,luggage,vehicle_category,flight_number,status,price_aed,payment_status,notes,enquiry_id)
 values(org,customer,enquiry.pickup_location_id,enquiry.dropoff_location_id,enquiry.pickup_at,outbound_end,enquiry.passengers,enquiry.luggage,enquiry.vehicle_category,enquiry.flight_number,'pending',enquiry.quoted_outbound_aed,'unpaid',enquiry.notes,enquiry.id) returning id into booking;
 if enquiry.transfer_type='return' then
  insert into public.bookings(organization_id,customer_id,pickup_location_id,dropoff_location_id,pickup_at,end_at,passengers,luggage,vehicle_category,status,price_aed,payment_status,notes,enquiry_id,return_of_booking_id)
  values(org,customer,enquiry.dropoff_location_id,enquiry.pickup_location_id,enquiry.return_at,return_end,enquiry.passengers,enquiry.luggage,enquiry.vehicle_category,'pending',enquiry.quoted_return_aed,'unpaid',enquiry.notes,enquiry.id,booking);
 end if;
 update public.booking_enquiries set status='converted',updated_at=now() where id=enquiry.id;
 return booking;
end; $$;
revoke all on function public.convert_booking_enquiry(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.convert_booking_enquiry(uuid,timestamptz,timestamptz) to authenticated;
create function private.enquiry_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status in ('converted','closed') and new.status<>old.status then raise exception 'Closed enquiries cannot be reopened'; end if;
 if new.status='converted' and old.status<>'converted' and not exists(select 1 from public.bookings where enquiry_id=new.id and organization_id=new.organization_id) then raise exception 'Convert the enquiry before changing its status'; end if;
 new.updated_at=now(); return new;
end; $$;
create trigger enquiry_status before update on public.booking_enquiries for each row execute function private.enquiry_status();

create or replace function public.cancel_staff_invitation(invitation_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare org uuid;
begin
 org=private.organization_id(); perform 1 from public.organizations where id=org for update;
 if private.current_role() is distinct from 'owner' then raise exception 'Only the owner may cancel invitations'; end if;
 update public.drivers d set account_status='inactive' from public.staff_invitations i where i.id=invitation_id and i.organization_id=org and d.organization_id=org and d.id=i.driver_id;
 update public.staff_members m set active=false from public.staff_invitations i where i.id=invitation_id and i.organization_id=org and m.organization_id=org and lower(m.email)=i.email and m.role<>'owner';
 update public.staff_invitations set expires_at=now() where id=invitation_id and organization_id=org;
end; $$;
create function private.route_safety() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='routes' then
  if tg_op='UPDATE' and (new.archived or new.pickup_location_id<>old.pickup_location_id or new.dropoff_location_id<>old.dropoff_location_id) and exists(select 1 from public.route_pricing where route_id=new.id and organization_id=new.organization_id and not archived) then raise exception 'Archive related prices before changing this route'; end if;
  perform 1 from public.locations where organization_id=new.organization_id and id in (new.pickup_location_id,new.dropoff_location_id) order by id for share;
  if not new.archived and (select count(*) from public.locations where organization_id=new.organization_id and id in (new.pickup_location_id,new.dropoff_location_id) and not archived)<>2 then raise exception 'Choose active pickup and drop-off locations'; end if;
 elsif tg_table_name='locations' then
  if new.archived and exists(select 1 from public.routes where organization_id=new.organization_id and not archived and (pickup_location_id=new.id or dropoff_location_id=new.id)) then raise exception 'Archive related routes before archiving this location'; end if;
 end if; return new;
end; $$;
create trigger route_safety before insert or update on public.routes for each row execute function private.route_safety();
create trigger route_safety before update on public.locations for each row execute function private.route_safety();
revoke all on function private.enquiry_status(),private.route_safety() from public,anon,authenticated;
commit;
