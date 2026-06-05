# Project Status

Last updated: 2026-06-05

## Completed

- Public GitHub repository connected locally.
- Node.js project initialized.
- NestJS backend scaffolded with TypeScript.
- Supabase project connected through local `.env`.
- Prisma schema drafted for the access model.
- Prisma seed setup added for initial roles.
- Supabase Auth helper service added.
- Prisma service/module added.
- Global request context middleware added.
- Global Supabase bearer-token auth guard added.
- Global ACL guard added.
- Central ACL service added with scoped-access rules.
- Database-backed auth context loading added.
- Public health endpoints added.
- Protected role, user, and organization read endpoints added.
- Databricks service foundation added.
- In-memory cache foundation added.
- Databricks statement-result cache added with 60 second TTL.
- Audit log service foundation added.
- Schema, API, and Supabase setup docs added.

## Current API Shape

Public:

- `GET /`
- `GET /health`
- `GET /health/config`
- `GET /auth/methods`

Protected:

- `GET /roles`
- `GET /users`
- `GET /organizations`
- `GET /claims`
- `GET /providers`
- `GET /patient-metrics`

## Blocked

Database migration is blocked by the current Supabase `DIRECT_URL` shape.

Current sanitized shape shows:

```text
DIRECT_URL user=postgres.<project-ref> direct db host
```

For Supabase direct migrations, the direct host usually needs user:

```text
postgres
```

Also encode password special characters in DB URLs. For example:

```text
@ -> %40
```

## Pending

- Fix `DIRECT_URL`.
- Run first Prisma migration.
- Seed initial roles.
- Create first developer profile and role assignment.
- Add signup request APIs.
- Add approval APIs.
- Add invite APIs.
- Add organization creation and approval APIs.
- Add practice and provider admin APIs.
- Add scoped Databricks query builders for `/claims`, `/providers`, and `/patient-metrics`.
- Add Redis driver behind the existing cache service later.
- Add audit calls inside admin mutation APIs once those APIs exist.
- Add e2e tests after the migration and seed are working.

