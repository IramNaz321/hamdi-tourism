-- REVIEW ONLY. Separate explicit approval required; no execution in this task.
-- Inserts only missing unpublished configuration. Existing settings are untouched.
-- Existing settings audit trigger can add one audit_events row on first insert.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $settings_guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id='9f53250d-5e05-409d-9182-3d45448aa399'::uuid) THEN
    RAISE EXCEPTION 'Expected organization missing; do not create a duplicate.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('public.business_settings') AND relrowsecurity) THEN
    RAISE EXCEPTION 'Settings table/RLS requires inspection first.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('private', 'audit_change', '', '1d8587c1efe3d5daec6ee5a6edadef7d'),
      ('private', 'protect_settings', '', '89a0a3f2f631be5719719b238959c010'),
      ('public', 'website_content', 'business_id uuid', 'ecec89abb1baf91c3f25db5770d70deb')
    ) AS expected(schema_name, function_name, arguments, definition_md5)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname=expected.schema_name AND p.proname=expected.function_name
        AND pg_get_function_identity_arguments(p.oid)=expected.arguments
        AND md5(pg_get_functiondef(p.oid))=expected.definition_md5
    )
  ) THEN RAISE EXCEPTION 'Function definitions differ from the reviewed reference. Stop and inspect; do not replace blindly.'; END IF;

END;
$settings_guard$;
INSERT INTO public.business_settings (
  organization_id, display_name, published, enquiries_enabled,
  brand_color, ink_color, canvas_color, font_family
) VALUES (
  '9f53250d-5e05-409d-9182-3d45448aa399'::uuid, 'HAMDI TOURISM', false, false,
  '#c5a46d', '#111827', '#f8f6f1', 'system'
) ON CONFLICT (organization_id) DO NOTHING;
COMMIT;
