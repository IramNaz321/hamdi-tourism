-- Read-only: run in the confirmed project's SQL Editor after authorized migrations.
-- This does not migrate, bootstrap, seed or change any record.
-- Confirm project hzcupgjphowrzvrdffrf in the dashboard before running.
select expected.name as required_table,
       c.oid is not null as exists,
       coalesce(c.relrowsecurity, false) as rls_enabled,
       (select count(*) from pg_policy p where p.polrelid = c.oid) as policy_count
from unnest(array[
  'organizations','staff_members','staff_invitations','drivers','vehicles',
  'customers','locations','routes','route_pricing','bookings','business_settings',
  'booking_enquiries','verified_payments','audit_events'
]) as expected(name)
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = expected.name
order by expected.name;

select proname as required_function, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in ('dashboard_summary','website_content','set_staff_access','reserve_staff_invitation')
order by proname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'business-media';

select tablename from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('bookings','drivers','vehicles','booking_enquiries')
order by tablename;
