# Project Status

Last updated: 2026-06-15

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
- Public retry APIs added for rejected, declined, or failed access requests.
- Protected user and organization approval/rejection APIs added.
- Protected invite list, create, and revoke APIs added.
- Public invite accept API added.
- Optional Resend invite email delivery added with local disabled mode.

Admin management:

- Protected role assignment list, create, and revoke APIs added.
- Protected user detail, disable, and reactivate APIs added.
- Protected organization detail, create, update, and status APIs added.
- Protected nested organization practice and user read APIs added.
- Protected nested organization provider read API added.
- Protected practice and provider reference APIs added.
- Protected reference detail and practice-provider nested reads added.
- Protected care coordinator assignment list, create, and revoke APIs added.
- Protected nested care coordinator assignment reads added for practices and providers.
- Protected nested care coordinator assignment reads added for organizations.
- Protected role, user, and organization read endpoints added.
- Protected platform audit-log read endpoint added with filters and page metadata.

Data and integrations:

- Databricks service foundation added.
- Scoped Databricks query builder added for first read APIs.
- Configurable Databricks table and filter-column mapping added for production schemas.
- Databricks async statement polling added with safe limits.
- Databricks optional result chunk fetching added at service level.
- API-level pagination metadata and result chunk hydration added for Databricks read routes.
- In-memory cache foundation added.
- Redis cache driver added behind the cache abstraction.
- Databricks statement-result cache added with 60 second TTL.
- Audit log service foundation added.
- Audit calls added for current admin mutations.
- Audit calls added for successful Databricks read queries with non-sensitive metadata.
- Databricks read sorting added with mapped `sortBy` and `sortDirection` query controls.
- Personal saved data-query preset APIs added with ownership and organization-scope checks.

Developer experience:

- README updated to reflect the current backend scope, validation workflow, and runtime capabilities.
- Environment/Supabase setup doc updated for Databricks mappings, cache, email, and runtime validation.
- API request examples added in `docs/api-examples.md`.
- Postman collection added in `docs/postman/radeion-backend.postman_collection.json`.
- Postman collection updated for nested reference, care coordinator, role assignment, and user lifecycle routes.
- Postman Databricks examples updated with sorted read coverage.
- Local learning guide created in gitignored `learning-notes/`.

Quality and operations:

- GitHub Actions CI added for Prisma validation, typecheck, lint, build, tests, and dependency audit.
- Health config now reports email and Databricks table/column mapping presence without exposing secrets.
- Public e2e tests now assert expanded health config shape and secret redaction.
- Public-route e2e smoke tests added and wired into CI.
- Authenticated-route e2e tests added with mocked auth context and Prisma.
- CI action pins updated to Node 24-compatible GitHub action runtimes.
- CI Prisma generate/validate now uses dummy database URLs instead of requiring real secrets.
- Dockerfile, Docker Compose Redis runtime, and deployment guide added.
- Runtime environment validation added for required secrets, cache mode, URLs, and numeric config.
- Production Docker Compose deployment config added with API health check.
- CI authenticated e2e setup fixed so dummy environment values load before `AppModule`.
- CI workflow now provides dummy required app environment values for validation, build, tests, and e2e.
- CI docs validation added for Postman JSON, request conventions, and route example coverage.
- Local progress commits pushed to `origin/codex-progress-updates` for PR preparation.
- Draft PR creation was attempted from `codex-progress-updates` to `master`, but the GitHub connector returned `403 Resource not accessible by integration` and the local GitHub CLI is not authenticated.

## Current API Shape

Public:

- `GET /`
- `GET /health`
- `GET /health/config`
- `GET /health/database`
- `GET /auth/methods`
- `POST /access-requests/users`
- `POST /access-requests/organizations`
- `POST /access-requests/users/:id/retry`
- `POST /access-requests/organizations/:id/retry`
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
- `GET /audit-logs`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id/disable`
- `PATCH /users/:id/reactivate`
- `GET /organizations`
- `GET /organizations/:id`
- `GET /organizations/:id/practices`
- `GET /organizations/:id/providers`
- `GET /organizations/:id/users`
- `POST /organizations`
- `PATCH /organizations/:id`
- `PATCH /organizations/:id/status`
- `GET /care-coordinators/assignments`
- `GET /care-coordinators/organizations/:organizationId/assignments`
- `GET /care-coordinators/practices/:practiceId/assignments`
- `GET /care-coordinators/providers/:providerId/assignments`
- `POST /care-coordinators/assignments`
- `POST /care-coordinators/assignments/:id/revoke`
- `GET /reference/practices`
- `GET /reference/practices/:id`
- `GET /reference/practices/:id/providers`
- `POST /reference/practices`
- `PATCH /reference/practices/:id`
- `GET /reference/providers`
- `GET /reference/providers/:id`
- `POST /reference/providers`
- `PATCH /reference/providers/:id`
- `GET /claims`
- `GET /providers`
- `GET /patient-metrics`
- `GET /data-query-presets`
- `POST /data-query-presets`
- `PATCH /data-query-presets/:id`
- `DELETE /data-query-presets/:id`

## To Do

Auth and onboarding:

- Build frontend signup stepper and connect failed/declined retry UX to the retry APIs.
- Add frontend password setup/recovery flow for invites and Supabase recovery.

Data and integrations:

- Fill production Databricks table/column environment values when final schemas are available.

Quality and operations:

- Create a GitHub PR from `codex-progress-updates` to `master` after GitHub auth or connector permissions are available.

Future route depth:

- Add additional child routes only when a concrete frontend workflow requires them.
