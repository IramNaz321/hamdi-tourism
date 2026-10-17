-- PROPOSAL ONLY: verify hosted schema and obtain explicit approval before applying.
-- No users, organizations or operational records are seeded.
begin;
create table public.driver_trip_progress (
 booking_id uuid primary key references public.bookings(id),
 driver_id uuid not null references public.drivers(id),
 accepted_at timestamptz, arrived_at timestamptz, picked_up_at timestamptz, completed_at timestamptz
);
alter table public.driver_trip_progress enable row level security;
revoke all on public.driver_trip_progress from public, anon, authenticated;

create function private.assigned_driver_id() returns uuid language sql stable security definer set search_path='' as $$
 select d.id from public.drivers d join public.staff_members m on m.user_id=d.auth_user_id and m.organization_id=d.organization_id
 where m.user_id=auth.uid() and m.active and m.role='driver' and not d.archived and d.account_status='active';
$$;
revoke all on function private.assigned_driver_id() from public,anon,authenticated;

create function public.driver_assigned_trips() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare driver uuid;
begin
 driver=private.assigned_driver_id();
 if driver is null then raise exception 'Driver access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(j order by j->>'pickup_at') from (
 select jsonb_build_object('id',b.id,'reference',b.reference,'status',b.status,'pickup_at',b.pickup_at,
 'pickup',a.name,'destination',z.name,'pickup_latitude',a.latitude,'pickup_longitude',a.longitude,
 'destination_latitude',z.latitude,'destination_longitude',z.longitude,'passengers',b.passengers,'luggage',b.luggage,
 'flight_number',b.flight_number,'instructions',b.notes,'customer_name',c.name,'customer_phone',c.phone,
 'vehicle',concat_ws(' ',v.make,v.model),'registration',v.plate_number,
 'accepted_at',p.accepted_at,'arrived_at',p.arrived_at,'picked_up_at',p.picked_up_at,'completed_at',p.completed_at) as j
 from public.bookings b
 join public.drivers d on d.id=b.driver_id and d.organization_id=b.organization_id
 join public.customers c on c.id=b.customer_id and c.organization_id=b.organization_id
 join public.locations a on a.id=b.pickup_location_id and a.organization_id=b.organization_id
 join public.locations z on z.id=b.dropoff_location_id and z.organization_id=b.organization_id
 left join public.vehicles v on v.id=b.vehicle_id and v.organization_id=b.organization_id
 left join public.driver_trip_progress p on p.booking_id=b.id and p.driver_id=b.driver_id
 where b.driver_id=driver and not b.archived and b.status in ('confirmed','in_progress')
 order by b.pickup_at limit 100
 ) trips),'[]'::jsonb);
end; $$;

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
 case action_name
 when 'accept' then
  if trip.status<>'confirmed' or progress.accepted_at is not null then raise exception 'Trip cannot be accepted'; end if;
  update public.driver_trip_progress set accepted_at=now() where booking_id=trip_id;
 when 'arrive' then
  if trip.status<>'confirmed' or progress.accepted_at is null or progress.arrived_at is not null then raise exception 'Accept the trip before marking arrival'; end if;
  update public.driver_trip_progress set arrived_at=now() where booking_id=trip_id;
 when 'pickup' then
  if trip.status<>'confirmed' or progress.arrived_at is null or progress.picked_up_at is not null then raise exception 'Record arrival before pickup'; end if;
  update public.bookings set status='in_progress' where id=trip_id;
  update public.driver_trip_progress set picked_up_at=now() where booking_id=trip_id;
 when 'complete' then
  if trip.status<>'in_progress' or progress.picked_up_at is null then raise exception 'Trip must be in progress'; end if;
  update public.bookings set status='completed' where id=trip_id;
  update public.driver_trip_progress set completed_at=now() where booking_id=trip_id;
 else raise exception 'Invalid trip action';
 end case;
end; $$;
revoke all on function public.driver_assigned_trips(),public.driver_trip_action(uuid,text) from public,anon;
grant execute on function public.driver_assigned_trips(),public.driver_trip_action(uuid,text) to authenticated;
commit;
