#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
container="hamdi-rls-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
# A fresh random password for a disposable database; no hosted project is contacted.
test_password=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')
docker run -d --name "$container" -e POSTGRES_PASSWORD="$test_password" -e POSTGRES_DB=hamdi_test postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U postgres >/dev/null
cat supabase/tests/auth-shim.sql supabase/migrations/*.sql supabase/tests/rls.sql | docker exec -i "$container" psql -U postgres -d hamdi_test -v ON_ERROR_STOP=1
