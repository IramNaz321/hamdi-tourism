begin;
create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',label;end if;raise notice 'PASS: %',label;end$$;
create function public.test_reject(command text,expected text[],label text) returns void language plpgsql as $$declare rejected boolean:=false;begin begin execute command;exception when others then if sqlstate=any(expected) then rejected:=true;else raise;end if;end;if not rejected then raise exception 'FAILED: %',label;end if;raise notice 'PASS: %',label;end$$;
insert into public.organizations(id,name)
 values('a0000000-0000-4000-8000-000000000011','Disposable unpriced enquiry fixture');
insert into public.business_settings(organization_id,display_name,published,enquiries_enabled)
 values('a0000000-0000-4000-8000-000000000011','Disposable fixture',true,true);
insert into public.locations(id,organization_id,name,kind,address,public_listed) values
 ('a2000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000011','Fixture airport','airport','Test-only',true),
 ('a2000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000011','Fixture destination','hotel','Test-only',true);
select set_config('test.manual_reference',public.submit_unpriced_transfer_enquiry(
 'a0000000-0000-4000-8000-000000000011','Test Customer','test@example.test','+971500000000',
 'a2000000-0000-4000-8000-000000000011','a2000000-0000-4000-8000-000000000012',
 'Terminal 3 arrivals','Hotel lobby',now()+interval '2 days',null,2,2,'sedan','one_way',
 'TEST123','Disposable fixture only'),true);
select public.test_assert(
 (select count(*)=1 from public.unpriced_transfer_enquiries
  where reference=current_setting('test.manual_reference') and email='test@example.test'
   and pickup_address='Terminal 3 arrivals' and dropoff_address='Hotel lobby'
   and notes='Disposable fixture only' and status='new'),
 'unpriced enquiry stores validated customer journey without a fare');
select public.test_assert(
 not exists(select 1 from public.bookings where organization_id='a0000000-0000-4000-8000-000000000011'),
 'manual enquiry does not create a booking');
select public.submit_unpriced_transfer_enquiry(
 'a0000000-0000-4000-8000-000000000011','Test Customer','test@example.test','+971500000000',
 'a2000000-0000-4000-8000-000000000011','a2000000-0000-4000-8000-000000000012',
 null,null,now()+interval '2 days',null,2,2,'sedan','one_way',null,null);
select public.submit_unpriced_transfer_enquiry(
 'a0000000-0000-4000-8000-000000000011','Test Customer','test@example.test','+971500000000',
 'a2000000-0000-4000-8000-000000000011','a2000000-0000-4000-8000-000000000012',
 null,null,now()+interval '2 days',null,2,2,'sedan','one_way',null,null);
select public.test_reject($q$select public.submit_unpriced_transfer_enquiry(
 'a0000000-0000-4000-8000-000000000011','Test Customer','test@example.test','+971500000000',
 'a2000000-0000-4000-8000-000000000011','a2000000-0000-4000-8000-000000000012',
 null,null,now()+interval '2 days',null,2,2,'sedan','one_way',null,null)$q$,
 array['P0001'],'customer enquiry rate limit enforced');
set local role anon;
select public.test_reject($q$select * from public.unpriced_transfer_enquiries$q$,array['42501'],'anonymous users cannot read manual enquiries');
select public.test_reject($q$select public.submit_unpriced_transfer_enquiry(
 'a0000000-0000-4000-8000-000000000011','Test Customer','other@example.test','+971500000000',
 'a2000000-0000-4000-8000-000000000011','a2000000-0000-4000-8000-000000000012',
 null,null,now()+interval '2 days',null,2,2,'sedan','one_way',null,null)$q$,
 array['42501'],'anonymous users cannot bypass CAPTCHA workflow with the RPC');
reset role;
select public.test_assert(not has_table_privilege('anon','public.unpriced_transfer_enquiries','SELECT'),'anonymous enquiry table privilege explicitly revoked');
select public.test_assert(not has_column_privilege('authenticated','public.unpriced_transfer_enquiries','name','UPDATE'),'staff grants cannot rewrite passenger personal data');
select public.test_assert(has_column_privilege('authenticated','public.unpriced_transfer_enquiries','status','UPDATE'),'authorized status workflow retains its explicit column grant');
rollback;
