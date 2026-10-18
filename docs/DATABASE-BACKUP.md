# Hamdi Tourism PostgreSQL backup

This procedure targets Supabase project `hzcupgjphowrzvrdffrf` through its confirmed PostgreSQL 17 session pooler. It creates a transaction-consistent custom-format `pg_dump` of all accessible database schemas and data. It is read-only against production: it does not apply migrations, change roles, or insert, update, or delete records.

## Securely provide the database password

In GitHub, open the `IramNaz321/hamdi-tourism` repository and go to **Settings → Secrets and variables → Codespaces → New repository secret**. Add a secret named `SUPABASE_DB_PASSWORD` containing only the database password for this Supabase project. Retrieve it from the project's Supabase dashboard; do not use a service-role API key, paste the password in chat, put it in a command argument, or save it in the repository. If the database password is unknown, use the Supabase dashboard's database password reset flow and securely retain the new password.

Codespaces secrets are injected into the Codespace environment, not automatically copied from another workspace. Restart or rebuild the existing Codespace after saving the secret so it becomes available to new terminals and processes. Alternatively, the script accepts `SUPABASE_DB_PASSWORD_FILE` pointing to a single-line credential file owned by the current user with no group or other permissions (for example mode `600`). Do not place that file in the repository.

## Run and locate the backup

From the repository root, run:

```bash
bash scripts/database/backup.sh
```

The script requires PostgreSQL 17 `psql`, `pg_dump`, and `pg_restore`, plus `openssl`. It pins the host, pooler port, database, and project-qualified pooler user; requires verified TLS; and checks the live database name, backend role (`postgres`), and server major version before starting the dump. Supavisor routes using the project-qualified login (`postgres.<project-ref>`), while PostgreSQL reports the backend role as `postgres`. It does not accept a connection string or print credentials. Missing or invalid credentials stop the script before a connection or dump.

For verified TLS, install the Supabase Root 2021 CA certificate from the project's **Database Settings → SSL Configuration** page at `~/.local/share/hamdi-tourism/certs/supabase-prod-ca-2021.crt` (or the corresponding path under `XDG_DATA_HOME`). The certificate directory and file must be owned by the current user and have no group or other permissions. The script pins the expected SHA-256 fingerprint before using this CA with `sslmode=verify-full`; do not disable certificate or hostname verification. If Supabase rotates the root CA, update this documented procedure and the fingerprint only after confirming the new CA through an official Supabase source.

The validated custom-format archive is saved outside the repository at:

```text
~/.local/share/hamdi-tourism/backups/
```

The backup directory has mode `700`, each completed dump has mode `600`, and a temporary password file is removed when the script exits. The dump is first written to a private temporary file and retained only after `pg_restore --list` validates it. The script never overwrites an existing destination or deletes previous backups. Store an additional copy in an appropriately encrypted, access-controlled backup location; the local file is not a substitute for off-device disaster recovery.

To inspect an archive without restoring it, use `pg_restore --list /absolute/path/to/the.dump`. Do not restore over production. A restore test is valid only against a separately authorized, isolated database.

## Coverage and limitations

- **PostgreSQL schema and data:** `pg_dump` takes a consistent snapshot and includes objects and rows it can access. Objects or rows hidden by permissions are not guaranteed to be present. Keep the completed archive confidential because it can contain personal, operational, and authentication data.
- **Supabase Auth:** Auth database objects and records are included only if visible and readable to the connecting role. A database dump does not include Auth provider/OAuth credentials, SMTP configuration, redirect URLs, JWT signing keys, or other Auth/project dashboard settings. Supabase-managed Auth objects and credentials should not be restored into another project without an explicitly supported migration plan.
- **Supabase Storage:** The database dump can include accessible Storage metadata (such as buckets, object keys, and policies); it does **not** include the actual object bytes held by Supabase Storage. Back up those objects separately using an authorized Storage export/download process.
- **Roles and grants:** Database object definitions and accessible object privileges are in the dump, but cluster-wide roles, role attributes, passwords, memberships, and Supabase-managed role definitions are not recreated by `pg_dump`. A target restore must have compatible roles and permissions provisioned separately.
- **Project settings:** Region, extensions/platform configuration, API keys, Auth settings, secrets, network restrictions, and other Supabase dashboard settings are not database contents and are not backed up by this procedure. Record/reconfigure them separately through approved secure processes; never add their secrets to the dump documentation.
- **Recovery point:** This is a point-in-time logical dump, not continuous WAL/PITR coverage or Supabase-managed backup service. Retain multiple protected copies and independently verify restore procedures.

## Restore verification status

The existing encrypted archive `hamdi-tourism-20261017T100542Z-77865.dump.gpg`
was decrypted directly into `pg_restore` stdin using its mode-600 local GPG
passphrase file; no plaintext dump or duplicate backup was created. On 17 October
2026 it restored successfully, with `pg_restore --exit-on-error
--single-transaction --no-owner --no-privileges`, into a disposable
`supabase/postgres:17.11.0.004` container using its isolated `supabase_admin`
role. A post-restore catalog check found 17 public tables and the expected
`bookings`, `staff_members` and `business_settings` tables. The throwaway
container was removed afterward. This verifies archive decryption and a
transactional logical restore, but does not verify Supabase Auth/dashboard
settings, Storage object bytes, PITR, or restore on a separate hosted project.

No production database was modified. Never infer current production recovery
readiness solely from this older logical restore test; confirm an appropriate
recovery point and separately authorize the restore target before any future
restore exercise.
