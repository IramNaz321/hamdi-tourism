#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

project_ref='hzcupgjphowrzvrdffrf'
db_host='aws-0-ap-northeast-1.pooler.supabase.com'
db_port='5432'
db_name='postgres'
db_user='postgres.hzcupgjphowrzvrdffrf'
backend_user='postgres'
tmp_dump=''
pgpass_file=''

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [[ -n "$tmp_dump" ]]; then
    rm -f -- "$tmp_dump"
  fi
  if [[ -n "$pgpass_file" ]]; then
    rm -f -- "$pgpass_file"
  fi
}
trap cleanup EXIT

if [[ -n "${SUPABASE_DB_PASSWORD+x}" && -n "${SUPABASE_DB_PASSWORD_FILE+x}" ]]; then
  fail 'Set only one of SUPABASE_DB_PASSWORD or SUPABASE_DB_PASSWORD_FILE.'
fi

if [[ -n "${SUPABASE_DB_PASSWORD+x}" ]]; then
  password=$SUPABASE_DB_PASSWORD
elif [[ -n "${SUPABASE_DB_PASSWORD_FILE+x}" ]]; then
  credential_file=$SUPABASE_DB_PASSWORD_FILE
  [[ -f "$credential_file" && ! -L "$credential_file" ]] ||
    fail 'The credential file must be a regular, non-symlink file.'
  [[ "$(stat -c '%u' -- "$credential_file")" == "$(id -u)" ]] ||
    fail 'The credential file must be owned by the current user.'
  credential_mode=$(stat -c '%a' -- "$credential_file")
  (( (8#$credential_mode & 077) == 0 )) ||
    fail 'The credential file must not grant group or other permissions.'
  [[ -r "$credential_file" ]] || fail 'The credential file is not readable.'
  credential_lines=()
  mapfile -t credential_lines < "$credential_file"
  [[ "${#credential_lines[@]}" -eq 1 ]] ||
    fail 'The credential file must contain exactly one non-empty line.'
  password=${credential_lines[0]}
else
  fail 'Database password is missing; set SUPABASE_DB_PASSWORD or SUPABASE_DB_PASSWORD_FILE. No connection was attempted.'
fi

[[ -n "$password" ]] || fail 'The database password is empty.'
case "$password" in
  *$'\n'*|*$'\r'*) fail 'The database password must be a single line.' ;;
esac

for utility in psql pg_dump pg_restore; do
  command -v "$utility" >/dev/null 2>&1 || fail "Required PostgreSQL utility not found: $utility."
done
for utility in psql pg_dump pg_restore; do
  utility_version=$("$utility" --version 2>/dev/null)
  [[ "$utility_version" == *' 17.'* ]] ||
    fail "$utility must be PostgreSQL 17."
done

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
repo_root=$(git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null) ||
  fail 'Could not determine the Git repository root.'
repo_root=$(realpath -e -- "$repo_root")
backup_dir="${XDG_DATA_HOME:-"$HOME/.local/share"}/hamdi-tourism/backups"
[[ ! -L "$backup_dir" ]] || fail 'The backup directory must not be a symlink.'
mkdir -p -- "$backup_dir"
chmod 700 -- "$backup_dir"
backup_dir=$(realpath -e -- "$backup_dir")
case "$backup_dir/" in
  "$repo_root/"*) fail 'The backup directory must be outside the Git repository.' ;;
esac
[[ "$(stat -c '%u' -- "$backup_dir")" == "$(id -u)" ]] ||
  fail 'The backup directory must be owned by the current user.'

ca_dir="${XDG_DATA_HOME:-"$HOME/.local/share"}/hamdi-tourism/certs"
ca_file="$ca_dir/supabase-prod-ca-2021.crt"
[[ -d "$ca_dir" && ! -L "$ca_dir" ]] ||
  fail 'The Supabase CA directory is missing or is a symlink.'
[[ -f "$ca_file" && ! -L "$ca_file" && -r "$ca_file" ]] ||
  fail 'The official Supabase CA certificate is missing or unreadable.'
[[ "$(stat -c '%u' -- "$ca_dir")" == "$(id -u)" &&
   "$(stat -c '%u' -- "$ca_file")" == "$(id -u)" ]] ||
  fail 'The Supabase CA directory and certificate must be owned by the current user.'
ca_dir_mode=$(stat -c '%a' -- "$ca_dir")
ca_file_mode=$(stat -c '%a' -- "$ca_file")
(( (8#$ca_dir_mode & 077) == 0 && (8#$ca_file_mode & 077) == 0 )) ||
  fail 'The Supabase CA directory and certificate must not grant group or other permissions.'
command -v openssl >/dev/null 2>&1 || fail 'Required utility not found: openssl.'
ca_fingerprint=$(openssl x509 -in "$ca_file" -noout -fingerprint -sha256 2>/dev/null |
  sed 's/.*=//; s/://g' | tr '[:lower:]' '[:upper:]') ||
  fail 'The Supabase CA certificate could not be read.'
[[ "$ca_fingerprint" == '807025AD50D4ED219D2C9C7D299C004F824EB00CF7F65AFEF607D07B72E6CAFA' ]] ||
  fail 'The Supabase CA certificate fingerprint did not match the verified project root CA.'

escaped_password=${password//\\/\\\\}
escaped_password=${escaped_password//:/\\:}
unset password SUPABASE_DB_PASSWORD
pgpass_file=$(mktemp "$backup_dir/.pgpass.XXXXXX")
chmod 600 -- "$pgpass_file"
printf '%s:%s:%s:%s:%s\n' \
  "$db_host" "$db_port" "$db_name" "$db_user" "$escaped_password" > "$pgpass_file"
unset escaped_password

export PGHOST="$db_host"
export PGPORT="$db_port"
export PGDATABASE="$db_name"
export PGUSER="$db_user"
export PGSSLMODE='verify-full'
export PGSSLROOTCERT="$ca_file"
export PGCONNECT_TIMEOUT='15'
export PGPASSFILE="$pgpass_file"
unset PGPASSWORD

identity_query="SELECT current_database() || '|' || current_user || '|' || (current_setting('server_version_num')::integer / 10000)::text"
if ! identity=$(psql -X -w -v ON_ERROR_STOP=1 -qAt -F '|' -c "$identity_query" 2>/dev/null); then
  fail 'Database identity query failed. Check the Codespaces secret, pooler access, and TLS; no dump was created.'
fi
[[ "$identity" == "$db_name|$backend_user|17" ]] ||
  fail 'Connected database identity did not match the expected database, backend role, and PostgreSQL major version; no dump was created.'

timestamp=$(date -u '+%Y%m%dT%H%M%SZ')
backup_path="$backup_dir/hamdi-tourism-${timestamp}-$$.dump"
[[ ! -e "$backup_path" ]] || fail 'The backup destination already exists; no file was overwritten.'
tmp_dump=$(mktemp "$backup_dir/.hamdi-tourism-${timestamp}-XXXXXX.dump.part")

if ! pg_dump --no-password --format=custom --file="$tmp_dump" 2>/dev/null; then
  fail 'pg_dump failed. No backup was retained; check database permissions and available storage.'
fi
[[ -s "$tmp_dump" ]] || fail 'pg_dump produced an empty archive; no backup was retained.'
if ! pg_restore --list "$tmp_dump" >/dev/null 2>&1; then
  fail 'The dump failed archive validation and was not retained.'
fi
chmod 600 -- "$tmp_dump"
mv -- "$tmp_dump" "$backup_path"
tmp_dump=''

backup_size=$(stat -c '%s' -- "$backup_path")
printf 'PASS: Project-qualified pooler connection verified for project %s (database %s, backend role %s, PostgreSQL 17).\n' \
  "$project_ref" "$db_name" "$backend_user"
printf 'CREATED: %s (%s bytes; permissions 600)\n' "$backup_path" "$backup_size"
