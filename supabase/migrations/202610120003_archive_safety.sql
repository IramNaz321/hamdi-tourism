begin;
create function private.check_archive() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.archived and (tg_op = 'INSERT' or not old.archived) then
    if tg_table_name = 'bookings' then
      if new.status not in ('completed','cancelled') then raise exception 'Complete or cancel a booking before archiving it'; end if;
    elsif tg_table_name in ('drivers','vehicles','customers','locations') then
      if exists (
        select 1 from public.bookings b where b.organization_id = new.organization_id and not b.archived and b.status not in ('completed','cancelled')
        and case tg_table_name when 'drivers' then b.driver_id = new.id when 'vehicles' then b.vehicle_id = new.id when 'customers' then b.customer_id = new.id else b.pickup_location_id = new.id or b.dropoff_location_id = new.id end
      ) then raise exception 'This record is assigned to an active booking'; end if;
      if tg_table_name = 'locations' and exists (select 1 from public.route_pricing p where p.organization_id = new.organization_id and not p.archived and (p.pickup_location_id = new.id or p.dropoff_location_id = new.id)) then raise exception 'Archive related route prices before archiving this location'; end if;
    end if;
  end if;
  if tg_table_name = 'route_pricing' and not new.archived then
    if (select count(*) from public.locations where organization_id = new.organization_id and id in (new.pickup_location_id,new.dropoff_location_id) and not archived) <> 2 then raise exception 'Choose active pickup and drop-off locations'; end if;
  end if;
  return new;
end; $$;
do $$ declare t text; begin
  foreach t in array array['drivers','vehicles','customers','locations','route_pricing','bookings'] loop
    execute format('create trigger check_archive before insert or update on public.%I for each row execute function private.check_archive()',t);
  end loop;
end $$;
revoke all on function private.check_archive() from public, anon, authenticated;
commit;
