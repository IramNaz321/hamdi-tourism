-- PROPOSAL ONLY: separate explicit execution approval required.
-- Verified target: hzcupgjphowrzvrdffrf. Run only through that project's connection.
-- One Owner membership; the existing audit trigger records the insertion.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $owner_activation$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('hamdi-owner-bootstrap', 0));
  PERFORM 1 FROM public.organizations
    WHERE id = '9f53250d-5e05-409d-9182-3d45448aa399'::uuid
      AND name = 'HAMDI TOURISM' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verified organization does not match. No changes made.';
  END IF;
  LOCK TABLE public.staff_members IN SHARE ROW EXCLUSIVE MODE;
  PERFORM 1 FROM auth.users
    WHERE id = '3fac97a0-fbd2-4cca-a8ef-2272011c6106'::uuid
      AND lower(email) = 'hamidshah3211@outlook.com'
      AND email_confirmed_at IS NOT NULL
      AND last_sign_in_at IS NOT NULL
      AND deleted_at IS NULL
      AND (banned_until IS NULL OR banned_until <= now()) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verified confirmed client account does not match. No changes made.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid = 'public.staff_members'::regclass
      AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE t.tgrelid = 'public.staff_members'::regclass
      AND t.tgname = 'audit_staff' AND NOT t.tgisinternal AND t.tgenabled = 'O'
      AND n.nspname = 'private' AND p.proname = 'audit_change'
      AND md5(pg_get_functiondef(p.oid)) = '1d8587c1efe3d5daec6ee5a6edadef7d'
  ) THEN
    RAISE EXCEPTION 'Staff RLS or reviewed audit trigger differs. Stop for review.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE role = 'owner'
      AND user_id <> '3fac97a0-fbd2-4cca-a8ef-2272011c6106'::uuid
  ) THEN
    RAISE EXCEPTION 'Another Owner exists. No changes made.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE user_id = '3fac97a0-fbd2-4cca-a8ef-2272011c6106'::uuid
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.staff_members
      WHERE user_id = '3fac97a0-fbd2-4cca-a8ef-2272011c6106'::uuid
        AND organization_id = '9f53250d-5e05-409d-9182-3d45448aa399'::uuid
        AND role = 'owner' AND active
    ) THEN
      RETURN; -- Already configured correctly: no duplicate or update.
    END IF;
    RAISE EXCEPTION 'Existing membership differs. No promotion or reassignment permitted.';
  END IF;
  INSERT INTO public.staff_members
    (user_id, organization_id, email, display_name, role, active)
  SELECT id, '9f53250d-5e05-409d-9182-3d45448aa399'::uuid,
    email, 'Hamid Shah', 'owner', true
  FROM auth.users WHERE id = '3fac97a0-fbd2-4cca-a8ef-2272011c6106'::uuid;
END;
$owner_activation$;
COMMIT;
