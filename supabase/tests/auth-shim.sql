-- Local PostgreSQL test harness ONLY. Supabase supplies these schemas/roles in production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create table auth.users(id uuid primary key, email text unique, email_confirmed_at timestamptz, deleted_at timestamptz, banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid; $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,delete on storage.objects to authenticated;
create publication supabase_realtime;

-- Local shim for testing private broadcast authorization, not a hosted Realtime service.
create schema realtime;
create table realtime.messages(id bigint generated always as identity primary key,topic text,extension text,payload jsonb,event text,private boolean);
alter table realtime.messages enable row level security;
grant usage on schema realtime to authenticated;
grant select,insert on realtime.messages to authenticated;
create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
create function realtime.send(payload jsonb,event text,topic text,private boolean default false) returns void language sql as $$insert into realtime.messages(topic,extension,payload,event,private) values(topic,'broadcast',payload,event,private)$$;
grant execute on function realtime.topic() to authenticated;
