-- Apply only with separate production approval and the worker paused.
-- Dependency: 010 owner outbox. No Auth, Owner membership or operational records change.
begin;
do $$begin
 if to_regclass('public.owner_booking_notification_outbox') is null then
  raise exception 'Owner notification migration 010 is required';
 end if;
 -- Do not migrate ambiguous in-flight deliveries from a different provider.
 if exists(select 1 from public.owner_booking_notification_outbox
   where status in ('queued','sending') and attempts>0) then
  raise exception 'Reconcile previously attempted owner notices before switching providers';
 end if;
end;$$;
create or replace function public.owner_notification_claim() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 -- Expired final leases must terminate and purge contacts, rather than strand sending rows.
 update public.owner_booking_notification_outbox set status='failed',leased_until=null,
  customer_name=null,customer_email=null,customer_phone=null
 where status in ('queued','sending') and (attempts>=5 or first_attempt_at<=now()-interval '10 minutes')
  and (leased_until is null or leased_until<now());
 with due as (
  select n.booking_id from public.owner_booking_notification_outbox n
  where n.status in ('queued','sending') and n.attempts<5 and n.next_attempt_at<=now()
   and (n.leased_until is null or n.leased_until<now())
  order by n.created_at limit 10 for update skip locked
 ), claimed as (
  update public.owner_booking_notification_outbox n set status='sending',attempts=n.attempts+1,
   leased_until=now()+interval '1 minute',lease_token=gen_random_uuid(),first_attempt_at=coalesce(n.first_attempt_at,now())
  from due where n.booking_id=due.booking_id returning n.*
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',n.booking_id,'booking_id',n.booking_id,'lease',n.lease_token,'reference',n.reference,
  'pickup_name',n.pickup_name,'dropoff_name',n.dropoff_name,'pickup_at',n.pickup_at,
  'customer_name',n.customer_name,'customer_email',n.customer_email,'customer_phone',n.customer_phone,
  'passengers',n.passengers,'luggage',n.luggage,'vehicle_category',n.vehicle_category,
  'price_aed',n.price_aed,'payment_status',n.payment_status,
  'flight_number',n.flight_number,'first_attempt_at',n.first_attempt_at,'attempt',n.attempts
 )),'[]'::jsonb) into result from claimed n;
 return result;
end;$$;
create or replace function public.owner_notification_result(notification uuid,provider_message text,was_accepted boolean,lease uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if was_accepted and length(trim(coalesce(provider_message,'')))=0 then raise exception 'Provider message ID required';end if;
 update public.owner_booking_notification_outbox set
  provider_id=case when was_accepted then provider_message else provider_id end,
  status=case when was_accepted then 'accepted' when attempts>=5 then 'failed' else 'queued' end,
  next_attempt_at=now()+interval '1 minute',leased_until=null,
  customer_name=case when was_accepted or attempts>=5 then null else customer_name end,
  customer_email=case when was_accepted or attempts>=5 then null else customer_email end,
  customer_phone=case when was_accepted or attempts>=5 then null else customer_phone end
 where booking_id=notification and status='sending' and lease_token=lease;
 if not found then raise exception 'Notification lease expired';end if;
end;$$;

revoke all on function public.owner_notification_claim() from public,anon,authenticated;
revoke all on function public.owner_notification_result(uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.owner_notification_claim() to service_role;
grant execute on function public.owner_notification_result(uuid,text,boolean,uuid) to service_role;
commit;
