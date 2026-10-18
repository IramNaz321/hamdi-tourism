-- Synthetic fixtures are isolated to a throwaway local database; never run this in production.
begin;
create function public.test_assert(ok boolean, label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',label; end if; raise notice 'PASS: %',label; end $$;
create function public.test_reject(command text, expected text[], label text) returns void language plpgsql as $$
declare rejected boolean := false; begin
  begin execute command; exception when others then
    if sqlstate = any(expected) then rejected := true; else raise; end if;
  end;
  if not rejected then raise exception 'FAILED: % did not reject',label; end if;
  raise notice 'PASS: %',label;
end $$;
insert into public.organizations(id,name) values ('10000000-0000-4000-8000-000000000001','Test organization A'),('10000000-0000-4000-8000-000000000002','Test organization B');
insert into auth.users(id,email) values
('20000000-0000-4000-8000-000000000001','owner-a@example.test'),('20000000-0000-4000-8000-000000000002','owner-b@example.test'),
('20000000-0000-4000-8000-000000000003','viewer@example.test'),('20000000-0000-4000-8000-000000000004','dispatcher@example.test'),
('20000000-0000-4000-8000-000000000005','disabled@example.test');
insert into public.staff_members(user_id,organization_id,email,display_name,role,active) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner-a@example.test','Test owner A','owner',true),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','owner-b@example.test','Test owner B','owner',true),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','viewer@example.test','Test viewer','viewer',true),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','dispatcher@example.test','Test dispatcher','dispatcher',true),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','disabled@example.test','Test disabled','manager',false);
insert into public.customers(id,organization_id,name,phone) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test customer A','test-only'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Test customer B','test-only');
insert into public.locations(id,organization_id,name,kind,address) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Test pickup','airport','Test address'),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Test dropoff','hotel','Test address');
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000001';
select public.test_assert((select count(*) = 1 from public.customers), 'owner sees only own business records');
select public.test_assert((select count(*) = 4 from public.staff_members), 'owner sees only own staff');
insert into public.drivers(organization_id,name,phone,email,license_number,license_expiry,status,account_status)
values ('10000000-0000-4000-8000-000000000001','Test-only driver','+971501234567','driver@example.test','TEST-LICENCE-001',current_date+30,'available','active');
select public.test_assert((select name = 'Test-only driver' and email = 'driver@example.test' from public.drivers where license_number = 'TEST-LICENCE-001'), 'owner creates and reads a driver');
select public.test_assert(public.driver_is_available((select id from public.drivers where license_number='TEST-LICENCE-001')), 'active driver with a current licence is available');
update public.drivers set name='Updated test-only driver',phone='+971509876543' where license_number='TEST-LICENCE-001';
select public.test_assert((select name='Updated test-only driver' and phone='+971509876543' from public.drivers where license_number='TEST-LICENCE-001'), 'owner updates driver details');
update public.drivers set license_expiry=current_date-1 where license_number='TEST-LICENCE-001';
select public.test_assert(not public.driver_is_available((select id from public.drivers where license_number='TEST-LICENCE-001')), 'expired licence prevents driver availability');
update public.drivers set license_expiry=current_date+30,account_status='inactive' where license_number='TEST-LICENCE-001';
select public.test_assert(not public.driver_is_available((select id from public.drivers where license_number='TEST-LICENCE-001')), 'inactive account prevents driver availability');
update public.drivers set account_status='active',archived=true where license_number='TEST-LICENCE-001';
select public.test_assert((select archived from public.drivers where license_number='TEST-LICENCE-001') and not public.driver_is_available((select id from public.drivers where license_number='TEST-LICENCE-001')), 'owner archives driver without losing its record');
select public.test_reject($q$delete from public.drivers where license_number='TEST-LICENCE-001'$q$,array['42501'],'driver hard delete denied to preserve business history');
select public.test_reject($q$insert into public.customers(organization_id,name,phone) values ('10000000-0000-4000-8000-000000000002','Test forged','test')$q$, array['42501'], 'cross-tenant insert denied');
select public.test_reject($q$update public.staff_members set role = 'owner' where role = 'viewer'$q$,array['42501'],'direct role modification denied');
select public.test_reject($q$select public.set_staff_access('20000000-0000-4000-8000-000000000001','viewer',true)$q$,array['P0001'],'last owner demotion denied');
select public.test_reject($q$select public.set_staff_access('20000000-0000-4000-8000-000000000002','viewer',true)$q$,array['P0001'],'cross-tenant staff modification denied');
select public.test_reject($q$delete from public.customers$q$,array['42501'],'hard delete denied');
select public.test_reject($q$insert into public.audit_events(organization_id,table_name,record_id,operation) values ('10000000-0000-4000-8000-000000000001','customers','fake','INSERT')$q$,array['42501'],'audit fabrication denied');
select public.reserve_staff_invitation('new-staff@example.test','Test invited staff','dispatcher');
reset role;
insert into auth.users(id,email) values ('20000000-0000-4000-8000-000000000006','new-staff@example.test');
select public.test_assert((select role = 'dispatcher' from public.staff_members where user_id = '20000000-0000-4000-8000-000000000006'),'invitation provisions only reserved role');
set local role authenticated;
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000004';
select public.test_assert((select count(*) = 1 from public.staff_members),'dispatcher cannot list staff');
select public.test_reject($q$select public.reserve_staff_invitation('unauthorized@example.test','Unauthorized','manager')$q$,array['P0001'],'dispatcher cannot invite');
select public.test_reject($q$insert into public.drivers(organization_id,name,phone,license_number,status) values ('10000000-0000-4000-8000-000000000001','Test','test','test','available')$q$,array['42501'],'dispatcher cannot create drivers');
with changed as (update public.drivers set name='Unauthorized edit' where license_number='TEST-LICENCE-001' returning id)
select public.test_assert((select count(*)=0 from changed),'dispatcher cannot update drivers');
insert into public.bookings(id,organization_id,customer_id,pickup_location_id,dropoff_location_id,pickup_at,end_at,vehicle_category,luggage,passengers,status,price_aed,payment_status) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002',now()+interval '1 day',now()+interval '1 day 1 hour','sedan',0,2,'pending',100,'unpaid');
select public.test_assert((select count(*) = 1 from public.bookings),'dispatcher creates booking');
select public.test_reject($q$update public.bookings set customer_id = '30000000-0000-4000-8000-000000000002'$q$,array['P0001','23503'],'cross-tenant booking relation denied');
select public.test_reject($q$update public.bookings set archived = true$q$,array['P0001'],'open booking cannot be archived');
select public.test_reject($q$update public.customers set archived = true$q$,array['P0001'],'customer assigned to open booking cannot be archived');
select public.test_reject($q$update public.bookings set status = 'in_progress'$q$,array['P0001'],'journey cannot start without assignments');
select public.test_assert((select outstanding_total = 100 and paid_total = 0 from public.dashboard_financials()),'financial aggregation reflects actual booking');
select public.test_reject($q$update public.bookings set payment_status='paid'$q$,array['P0001'],'unverified payments cannot be marked successful');
update public.bookings set status='cancelled',cancellation_reason='Test cancellation';
update public.bookings set archived = true;
select public.test_assert((select paid_total = 0 and outstanding_total = 0 from public.dashboard_financials()),'unverified historical payment labels never count as revenue');
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000003';
select public.test_assert((select count(*) = 1 from public.customers),'viewer reads own business');
select public.test_reject($q$insert into public.customers(organization_id,name,phone) values ('10000000-0000-4000-8000-000000000001','Test denied','test')$q$,array['42501'],'viewer cannot create customers');
with changed as (update public.customers set name = 'Forged' returning id) select public.test_assert((select count(*) = 0 from changed),'viewer cannot update customers');
select public.test_reject($q$select public.set_staff_access('20000000-0000-4000-8000-000000000003','owner',true)$q$,array['P0001'],'viewer cannot promote self');
set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000005';
select public.test_assert((select count(*) = 0 from public.customers),'disabled member has no business data access');
select public.test_reject($q$insert into public.customers(organization_id,name,phone) values ('10000000-0000-4000-8000-000000000001','Test denied','test')$q$,array['42501'],'disabled member cannot create records');
reset role;
set local role anon;
select public.test_reject($q$select * from public.customers$q$,array['42501'],'anonymous business record access denied');
select public.test_reject($q$select public.reserve_staff_invitation('anonymous@example.test','Test denied','owner')$q$,array['42501'],'anonymous invitation denied');
reset role;
select public.test_assert((select count(*) > 0 from public.audit_events),'operational changes are audited');
rollback;
