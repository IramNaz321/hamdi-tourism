begin;
create function public.driver_is_available(target_driver_id uuid,at_time timestamptz default now()) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.drivers d where d.id=target_driver_id and not d.archived and d.account_status='active' and d.status='available' and (d.license_expiry is null or d.license_expiry >= (at_time at time zone 'Asia/Dubai')::date) and not exists(select 1 from public.bookings b where b.driver_id=d.id and not b.archived and (b.status='in_progress' or (b.status='confirmed' and b.pickup_at<=at_time and (b.reserved_until is null or b.reserved_until>at_time)))));
$$;
create function public.booking_financials(target_booking_id uuid) returns numeric language sql stable security invoker set search_path='' as $$
 select coalesce(sum(case when kind='charge' then amount_aed else -amount_aed end),0) from public.verified_payments where booking_id=target_booking_id;
$$;
revoke all on function public.driver_is_available(uuid,timestamptz),public.booking_financials(uuid) from public,anon;
grant execute on function public.driver_is_available(uuid,timestamptz),public.booking_financials(uuid) to authenticated;
create function private.inventory_safety() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if ((tg_table_name='drivers' and to_jsonb(new)->>'status'='unavailable') or (tg_table_name='vehicles' and to_jsonb(new)->>'status' in ('unavailable','inactive','maintenance')))
 and exists(select 1 from public.bookings b where b.organization_id=new.organization_id and not b.archived and b.status in ('confirmed','in_progress') and case when tg_table_name='drivers' then b.driver_id=new.id else b.vehicle_id=new.id end) then raise exception 'Reassign or cancel confirmed trips before disabling this driver or vehicle'; end if;
 return new;
end; $$;
create trigger inventory_safety before update on public.drivers for each row execute function private.inventory_safety();
create trigger inventory_safety before update on public.vehicles for each row execute function private.inventory_safety();
revoke all on function private.inventory_safety() from public,anon,authenticated;
-- Only one actual in-progress trip per driver/vehicle, even if a trip overruns its planned end.
create unique index one_driver_active_trip_idx on public.bookings(organization_id,driver_id) where not archived and status='in_progress' and driver_id is not null;
create unique index one_vehicle_active_trip_idx on public.bookings(organization_id,vehicle_id) where not archived and status='in_progress' and vehicle_id is not null;
commit;
