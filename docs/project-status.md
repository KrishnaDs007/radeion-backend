# Project Status

Last updated: 2026-06-08

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
- Protected invite list, create, and revoke APIs added.
- Public invite accept API added.
- Protected practice and provider reference APIs added.
- Protected role assignment list, create, and revoke APIs added.
- Protected user detail, disable, and reactivate APIs added.
- Protected organization detail, create, update, and status APIs added.
- Protected care coordinator assignment list, create, and revoke APIs added.
- Protected role, user, and organization read endpoints added.
- Databricks service foundation added.
- Scoped Databricks query builder added for first read APIs.
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
- `GET /roles/assignments`
- `POST /roles/assignments`
- `POST /roles/assignments/:id/revoke`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id/disable`
- `PATCH /users/:id/reactivate`
- `GET /organizations`
- `GET /organizations/:id`
- `POST /organizations`
- `PATCH /organizations/:id`
- `PATCH /organizations/:id/status`
- `GET /care-coordinators/assignments`
- `POST /care-coordinators/assignments`
- `POST /care-coordinators/assignments/:id/revoke`
- `GET /reference/practices`
- `POST /reference/practices`
- `PATCH /reference/practices/:id`
- `GET /reference/providers`
- `POST /reference/providers`
- `PATCH /reference/providers/:id`
- `GET /claims`
- `GET /providers`
- `GET /patient-metrics`

## Pending

Current focus:

- Add scoped top-level admin reads so non-platform admins see only their organization data. Done for user and organization reads.

Auth and onboarding:

- Signup request APIs. Done for initial request capture; pending frontend stepper and failed/declined retry UX.
- Approval APIs. Done for initial organization/user approve and reject flow.
- Invite APIs. Done for list/create/revoke and backend accept flow; pending frontend password setup/email delivery.
- Supabase password reset/recovery UX. Pending frontend integration.

Admin management:

- Organization creation and approval APIs. Done for approval flow and direct admin create/update/status.
- Direct role assignment/revocation APIs. Done for list/create/revoke.
- User lifecycle admin APIs. Done for detail/disable/reactivate.
- Care coordinator assignment APIs. Done for list/create/revoke.
- Practice and provider admin APIs. Done for initial list/create/update.
- Scoped admin read filters. Done for top-level user and organization reads; pending for reference and assignment lists.

Data and integrations:

- Scoped Databricks query builders for `/claims`, `/providers`, and `/patient-metrics`. Done for initial standard columns and env-configured tables.
- Real Databricks table/column mapping from production schemas. Pending.
- Databricks pagination/async statement polling. Pending.
- Redis driver behind the existing cache service. Pending.

Quality and operations:

- Audit calls inside admin mutation APIs. Done for current admin mutations; continue adding with new mutations.
- E2E tests after the migration and seed are stable. Pending.
- API request examples/Postman collection. Pending.
- Deployment configuration and CI. Pending.
- GitHub push/PR workflow for current local commits. Pending when ready.

Future route depth:

- Nested organization routes such as `/organizations/:id/practices` and `/organizations/:id/users`. Pending after top-level APIs are stable.
- Nested practice/provider-specific care coordinator views. Pending after top-level assignment APIs are stable.
