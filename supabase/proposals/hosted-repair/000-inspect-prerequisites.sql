-- ONE READ-ONLY QUERY. Run this inspection only; repair candidates are not approved.
-- No credentials, customer data, Auth users or precise GPS are selected.
SELECT jsonb_build_object(
  'server_version', current_setting('server_version_num'),
  'organization_exists', EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id='9f53250d-5e05-409d-9182-3d45448aa399'::uuid
  ),
  'settings', (
    SELECT jsonb_build_object('exists',true,'published',published,
      'enquiries_enabled',enquiries_enabled)
    FROM public.business_settings
    WHERE organization_id='9f53250d-5e05-409d-9182-3d45448aa399'::uuid
  ),
  'function_fingerprints', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'signature',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
      'definition_md5',md5(pg_get_functiondef(p.oid)),
      'public_execute',EXISTS (
        SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        WHERE a.grantee=0 AND a.privilege_type='EXECUTE'
      ),
      'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'service_role_execute',has_function_privilege('service_role',p.oid,'EXECUTE')
    ) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','private') AND p.prokind='f'
  ),
  'indexes', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,
      'definition',indexdef) ORDER BY tablename,indexname),'[]'::jsonb)
    FROM pg_indexes WHERE schemaname='public'
  ),
  'triggers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,
      'name',t.tgname,'enabled',t.tgenabled,
      'definition',pg_get_triggerdef(t.oid)) ORDER BY n.nspname,c.relname,t.tgname),'[]'::jsonb)
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace f ON f.oid=p.pronamespace
    WHERE NOT t.tgisinternal AND
      (n.nspname='public' OR (n.nspname='auth' AND c.relname='users' AND f.nspname='private'))
  ),
  'storage_realtime_policies', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('schema',schemaname,'table',tablename,
      'name',policyname,'command',cmd,'roles',roles,'using',qual,'with_check',with_check)
      ORDER BY schemaname,tablename,policyname),'[]'::jsonb)
    FROM pg_policies WHERE (schemaname='storage' AND tablename='objects')
      OR (schemaname='realtime' AND tablename='messages')
  ),
  'table_grants', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table',table_name,'role',grantee,
      'privilege',privilege_type) ORDER BY table_name,grantee,privilege_type),'[]'::jsonb)
    FROM information_schema.table_privileges
    WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role','PUBLIC')
  ),
  'column_grants', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,
      'role',grantee,'privilege',privilege_type)
      ORDER BY table_name,column_name,grantee,privilege_type),'[]'::jsonb)
    FROM information_schema.column_privileges
    WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role','PUBLIC')
  ),
  'public_policy_modes', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,
      'mode',permissive) ORDER BY tablename,policyname),'[]'::jsonb)
    FROM pg_policies WHERE schemaname='public'
  ),
  'schema_access', (
    SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,
      'anon_usage',has_schema_privilege('anon',n.oid,'USAGE'),
      'authenticated_usage',has_schema_privilege('authenticated',n.oid,'USAGE'))
      ORDER BY n.nspname)
    FROM pg_namespace n WHERE n.nspname IN ('public','private')
  ),
  'media_bucket', (
    SELECT jsonb_build_object('public',public,'file_size_limit',file_size_limit,
      'allowed_mime_types',allowed_mime_types)
    FROM storage.buckets WHERE id='business-media'
  ),
  'realtime_tables', (
    SELECT coalesce(jsonb_agg(tablename ORDER BY tablename),'[]'::jsonb)
    FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public'
  ),
  'extensions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'installed_version',installed_version)
      ORDER BY name),'[]'::jsonb)
    FROM pg_available_extensions WHERE name IN ('pg_cron','pgcrypto','btree_gist')
  ),
  'cron_job_table_exists',to_regclass('cron.job') IS NOT NULL
) AS repair_prerequisites;
