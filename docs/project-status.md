# Project Status

Last updated: 2026-06-11

## Completed

Foundation:

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
- Schema, API, Supabase setup, and request-example docs added.

Auth and ACL:

- Supabase Auth helper service added.
- Global request context middleware added.
- Global Supabase bearer-token auth guard added.
- Global ACL guard added.
- Central ACL service added with scoped-access rules.
- Database-backed auth context loading added.
- Scoped admin read filters added for top-level user, organization, reference, and assignment reads.

Access and onboarding:

- Public user and organization access request APIs added.
- Protected user and organization approval/rejection APIs added.
- Protected invite list, create, and revoke APIs added.
- Public invite accept API added.

Admin management:

- Protected role assignment list, create, and revoke APIs added.
- Protected user detail, disable, and reactivate APIs added.
- Protected organization detail, create, update, and status APIs added.
- Protected practice and provider reference APIs added.
- Protected care coordinator assignment list, create, and revoke APIs added.
- Protected role, user, and organization read endpoints added.

Data and integrations:

- Databricks service foundation added.
- Scoped Databricks query builder added for first read APIs.
- Databricks async statement polling added with safe limits.
- Databricks optional result chunk fetching added at service level.
- API-level pagination metadata and result chunk hydration added for Databricks read routes.
- In-memory cache foundation added.
- Redis cache driver added behind the cache abstraction.
- Databricks statement-result cache added with 60 second TTL.
- Audit log service foundation added.
- Audit calls added for current admin mutations.

Developer experience:

- API request examples added in `docs/api-examples.md`.
- Postman collection added in `docs/postman/radeion-backend.postman_collection.json`.
- Local learning guide created in gitignored `learning-notes/`.

Quality and operations:

- GitHub Actions CI added for Prisma validation, typecheck, lint, build, tests, and dependency audit.
- Public-route e2e smoke tests added and wired into CI.
- CI action pins updated to Node 24-compatible GitHub action runtimes.
- Dockerfile, Docker Compose Redis runtime, and deployment guide added.

## Current API Shape

Public:

- `GET /`
- `GET /health`
- `GET /health/config`
- `GET /auth/methods`
- `POST /access-requests/users`
- `POST /access-requests/organizations`
- `POST /invites/accept`

Protected:

- `POST /access-requests/users/:id/approve`
- `POST /access-requests/users/:id/reject`
- `POST /access-requests/organizations/:id/approve`
- `POST /access-requests/organizations/:id/reject`
- `GET /invites`
- `POST /invites`
- `POST /invites/:id/revoke`
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

## To Do

Auth and onboarding:

- Build frontend signup stepper and failed/declined retry UX.
- Add frontend password setup/recovery flow for invites and Supabase recovery.
- Add email delivery integration for invites.

Data and integrations:

- Add real Databricks table/column mapping from production schemas.

Quality and operations:

- Add authenticated e2e tests after a stable test-auth strategy is chosen.
- Add deployment configuration.
- Push current local commits and create a GitHub PR when ready.

Future route depth:

- Add nested organization routes such as `/organizations/:id/practices` and `/organizations/:id/users`.
- Add nested practice/provider-specific care coordinator views.
