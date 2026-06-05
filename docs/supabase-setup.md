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
