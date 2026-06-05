# Supabase Setup

This project uses Supabase Auth for authentication and Supabase Postgres as the application database.

## Required Local Environment Variables

Create a local `.env` file from `.env.example`.

Required values:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

Do not commit `.env`.

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

Databricks values are read from `.env`:

- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN`
- `DATABRICKS_HTTP_PATH`
- `DATABRICKS_WAREHOUSE_ID` optional

If `DATABRICKS_WAREHOUSE_ID` is omitted, the backend attempts to parse it from `DATABRICKS_HTTP_PATH`, such as `/sql/1.0/warehouses/<warehouse-id>`.
