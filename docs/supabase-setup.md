# Environment And Supabase Setup

This project uses Supabase Auth for authentication and Supabase Postgres as the application database.

## Required Local Environment Variables

Create a local `.env` file from `.env.example`.

Required Supabase and database values:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

Do not commit `.env`.

The backend validates required configuration during application boot. Missing required Supabase, database, or Databricks values will stop the app with a clear startup error.

## Auth Settings

Initial auth method:

- Email/password
- Email verification enabled

Application profile records should be created only after email verification. Signup and approval request records should still track pending, rejected, declined, and failed requests.

## First Developer Bootstrap

After creating and verifying the first Supabase Auth user, run:

```powershell
npm run bootstrap:developer -- user@example.com
```

If exactly one verified Supabase Auth user exists, the email argument can be omitted.

The script creates or updates an active `profiles` record and adds a global `developer` role assignment.

## Database URLs

Use Supabase connection strings for Prisma:

- `DATABASE_URL` for normal Prisma database access.
- `DIRECT_URL` for direct migration access.

Typical Supabase username shapes:

- Pooler URL: `postgres.<project-ref>`
- Direct URL: `postgres`

If the database password contains special URL characters such as `@`, encode them before using the value in a connection URL. For example, `@` becomes `%40`.

## Security Note

If a database password or secret key is ever pasted into chat, logs, screenshots, or a public place, rotate it in Supabase before treating the project as secure.

Use fake or development data only until healthcare compliance requirements are confirmed.

## Databricks Environment

Required Databricks values are read from `.env`:

- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN`
- `DATABRICKS_HTTP_PATH`

Optional Databricks runtime tuning:

- `DATABRICKS_WAREHOUSE_ID`
- `DATABRICKS_POLL_MAX_ATTEMPTS`
- `DATABRICKS_POLL_INTERVAL_MS`
- `DATABRICKS_MAX_RESULT_CHUNKS`

If `DATABRICKS_WAREHOUSE_ID` is omitted, the backend attempts to parse it from `DATABRICKS_HTTP_PATH`, such as `/sql/1.0/warehouses/<warehouse-id>`.

Databricks table and column mappings are also configured through `.env`.

Table variables:

- `DATABRICKS_CLAIMS_TABLE`
- `DATABRICKS_PROVIDERS_TABLE`
- `DATABRICKS_PATIENT_METRICS_TABLE`

Column mapping variables follow each dataset name:

- `*_ORGANIZATION_ID_COLUMN`
- `*_PRACTICE_ID_COLUMN`
- `*_PROVIDER_ID_COLUMN`
- `*_PATIENT_ID_COLUMN`
- `*_DATE_COLUMN` for datasets that support date filtering

Use `.env.example` as the exact source of truth for names. Production values should match the final Databricks schemas.

## Cache Environment

Local development defaults to in-memory cache:

```text
CACHE_DRIVER=memory
REDIS_URL=
```

To use Redis, set:

```text
CACHE_DRIVER=redis
REDIS_URL=redis://...
```

When `CACHE_DRIVER=redis`, `REDIS_URL` is required.

## Email Environment

Local invite email delivery is disabled by default:

```text
EMAIL_DRIVER=disabled
```

To send invite emails with Resend, configure:

```text
EMAIL_DRIVER=resend
EMAIL_FROM=...
RESEND_API_KEY=...
RESEND_API_URL=https://api.resend.com/emails
INVITE_ACCEPT_URL=...
PASSWORD_RECOVERY_REDIRECT_URL=...
```

The invite API still returns the one-time `inviteToken`; email delivery reports `sent`, `skipped`, or `failed` in the invite creation response.

`PASSWORD_RECOVERY_REDIRECT_URL` is optional. When set, the backend passes it to Supabase for `POST /auth/password-recovery` so recovery emails return users to the configured frontend recovery page.
