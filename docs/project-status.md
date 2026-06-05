# Project Status

Last updated: 2026-06-05

## Completed

- Public GitHub repository connected locally.
- Node.js project initialized.
- NestJS backend scaffolded with TypeScript.
- Supabase project connected through local `.env`.
- Prisma schema drafted for the access model.
- Prisma seed setup added for initial roles.
- First Prisma migration applied to Supabase.
- Initial roles seeded into Supabase.
- First developer bootstrap script added.
- First verified developer user created and bootstrapped.
- Supabase Auth helper service added.
- Prisma service/module added.
- Global request context middleware added.
- Global Supabase bearer-token auth guard added.
- Global ACL guard added.
- Central ACL service added with scoped-access rules.
- Database-backed auth context loading added.
- Public health endpoints added.
- Public database health endpoint added.
- Public user and organization access request APIs added.
- Protected user and organization approval APIs added.
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

## Pending

- Add signup request APIs. Done for initial request capture; pending approval/activation flow remains.
- Add approval APIs. Done for initial organization/user approve and reject flow.
- Add invite APIs.
- Add organization creation and approval APIs.
- Add practice and provider admin APIs.
- Add scoped Databricks query builders for `/claims`, `/providers`, and `/patient-metrics`.
- Add Redis driver behind the existing cache service later.
- Add audit calls inside admin mutation APIs once those APIs exist.
- Add e2e tests after the migration and seed are working.
