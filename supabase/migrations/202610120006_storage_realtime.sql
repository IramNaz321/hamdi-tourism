begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('business-media','business-media',false,5242880,array['image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy business_media_read on storage.objects for select to authenticated using (
 bucket_id='business-media' and split_part(name,'/',1)=(select private.organization_id())::text and (select private.current_role()) in ('owner','manager','dispatcher','viewer')
);
create policy business_media_insert on storage.objects for insert to authenticated with check (
 bucket_id='business-media' and split_part(name,'/',1)=(select private.organization_id())::text and
 ((split_part(name,'/',2) in ('vehicles','locations') and (select private.current_role()) in ('owner','manager')) or (split_part(name,'/',2)='logo' and (select private.current_role())='owner'))
);
create policy business_media_delete on storage.objects for delete to authenticated using (
 bucket_id='business-media' and split_part(name,'/',1)=(select private.organization_id())::text and
 ((split_part(name,'/',2) in ('vehicles','locations') and (select private.current_role()) in ('owner','manager')) or (split_part(name,'/',2)='logo' and (select private.current_role())='owner'))
);
-- Realtime sends only changes permitted by each subscriber's RLS. No coordinates are simulated.
do $$ declare t text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['bookings','drivers','vehicles','booking_enquiries'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
  end loop;
 end if;
end $$;
commit;
