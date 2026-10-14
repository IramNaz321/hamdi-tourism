#!/usr/bin/env bash
# Disposable local PostgreSQL only. No hosted URL, secret, project or provider is contacted.
set -euo pipefail
cd "$(dirname "$0")/../.."
repair_container="hamdi-repair-$$"
repair_tmp=$(mktemp -d)
cleanup() {
  docker rm -f "$repair_container" >/dev/null 2>&1 || true
  rm -rf "$repair_tmp"
}
trap cleanup EXIT
repair_password=$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')
docker run -d --name "$repair_container" -e POSTGRES_PASSWORD="$repair_password" -e POSTGRES_DB=hamdi_test postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$repair_container" pg_isready -h 127.0.0.1 -U postgres -d hamdi_test >/dev/null 2>&1; then break; fi
  sleep 1
done
repair_expect() { node -e 'if(!require("fs").readFileSync(process.argv[1],"utf8").includes(process.argv[2]))process.exit(1)' "$1" "$2"; }
repair_psql() { docker exec -i "$repair_container" psql -h 127.0.0.1 -U postgres -d hamdi_test -v ON_ERROR_STOP=1 "$@"; }
cat supabase/tests/auth-shim.sql supabase/migrations/20261012000{1,2,3,4,5,6,7}_*.sql | repair_psql > "$repair_tmp/setup.log" 2>&1
if repair_psql < supabase/proposals/hosted-repair/010-settings-candidate.sql > "$repair_tmp/missing-org.log" 2>&1; then
  printf 'FAIL: settings repair must not create an organization.\n'; exit 1
fi
repair_expect "$repair_tmp/missing-org.log" 'Expected organization missing'
# This one organization is an isolated test fixture, never a hosted seed.
printf "%s\n" "insert into public.organizations(id,name) values('9f53250d-5e05-409d-9182-3d45448aa399','Test-only repair fixture');" | repair_psql >/dev/null
repair_psql -At < supabase/proposals/hosted-repair/000-inspect-prerequisites.sql > "$repair_tmp/inspection.json"
node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$repair_tmp/inspection.json"
for attempt in 1 2; do
  repair_psql < supabase/proposals/hosted-repair/010-settings-candidate.sql > "$repair_tmp/settings.log" 2>&1
done
printf "%s\n" "select count(*)=1 and bool_and(not published and not enquiries_enabled) from public.business_settings; select count(*)=1 from public.audit_events where table_name='business_settings';" | repair_psql -At > "$repair_tmp/assertions"
if repair_psql < supabase/proposals/hosted-repair/020-driver-candidate.sql > "$repair_tmp/retention.log" 2>&1; then
  printf 'FAIL: Driver production preflight must reject absent pg_cron.\n'; exit 1
fi
repair_expect "$repair_tmp/retention.log" 'pg_cron retention prerequisite unavailable'
printf "%s\n" "select to_regclass('public.driver_trip_progress') is null;" | repair_psql -At >> "$repair_tmp/assertions"
if repair_psql < supabase/proposals/hosted-repair/030-passenger-candidate.sql > "$repair_tmp/order.log" 2>&1; then
  printf 'FAIL: Passenger must reject absent Driver dependencies.\n'; exit 1
fi
repair_expect "$repair_tmp/order.log" 'Function definitions differ'
printf "%s\n" "select to_regclass('public.passenger_profiles') is null;" | repair_psql -At >> "$repair_tmp/assertions"
# Validate original 008 source bodies locally. The original migration skips pg_cron
# when unavailable; the production candidate correctly refuses that condition above.
# This is NOT a test of a live cron worker or successful production 020 installation.
repair_psql < supabase/migrations/202610120008_driver_tracking.sql > "$repair_tmp/driver-source.log" 2>&1
repair_psql -At < supabase/proposals/hosted-repair/000-inspect-prerequisites.sql > "$repair_tmp/stage8.json"
repair_psql < supabase/proposals/hosted-repair/030-passenger-candidate.sql > "$repair_tmp/passenger.log" 2>&1
repair_psql -At < supabase/proposals/hosted-repair/000-inspect-prerequisites.sql > "$repair_tmp/stage9.json"
if repair_psql < supabase/proposals/hosted-repair/030-passenger-candidate.sql > "$repair_tmp/replay.log" 2>&1; then
  printf 'FAIL: an already installed Passenger module must not replay.\n'; exit 1
fi
printf "%s\n" "select count(*)=32 and bool_and(c.relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p');" | repair_psql -At >> "$repair_tmp/assertions"
node -e 'const a=require("fs").readFileSync(process.argv[1],"utf8").trim().split(/\s+/);if(a.length!==5||a.some(v=>v!=="t"))process.exit(1)' "$repair_tmp/assertions"
# Hash-only references: regenerating is an explicit local operation, never a hosted default.
node --import tsx scripts/verification/repair-reference.ts "$repair_tmp/inspection.json" "$repair_tmp/stage8.json" "$repair_tmp/stage9.json" "${HAMDI_WRITE_REPAIR_REFERENCE:-false}"
# Remove only our throwaway fixture before legacy SQL tests seed their own isolated data.
printf "%s\n" "delete from public.audit_events where organization_id='9f53250d-5e05-409d-9182-3d45448aa399'; delete from public.business_settings where organization_id='9f53250d-5e05-409d-9182-3d45448aa399'; delete from public.organizations where id='9f53250d-5e05-409d-9182-3d45448aa399';" | repair_psql >/dev/null
cat supabase/tests/rls.sql supabase/tests/expanded.sql supabase/tests/driver-portal.sql supabase/tests/tracking.sql supabase/tests/passenger.sql | repair_psql > "$repair_tmp/rls.log" 2>&1 || { tail -25 "$repair_tmp/rls.log"; exit 1; }
printf 'PASS: local repair inspection, settings idempotency, organization/retention/order/replay guards, 32 RLS-enabled tables.\n'
printf 'PASS: %s local RLS/workflow assertions after guarded Passenger installation.\n' "$(node -e 'console.log((require("fs").readFileSync(process.argv[1],"utf8").match(/PASS:/g)||[]).length)' "$repair_tmp/rls.log")"
