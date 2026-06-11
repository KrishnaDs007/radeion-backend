# API Architecture

This project uses NestJS modules, controllers, middleware, guards, decorators, and services instead of a separate Express router folder.

## Routing Model

NestJS controllers act as route groups.

Current route groups:

- `GET /` public health-style root
- `GET /health` public health status
- `GET /health/config` public config-presence status without secret values
- `GET /health/database` public database connectivity status
- `GET /auth/methods` public auth configuration
- `POST /access-requests/users` public user access request
- `POST /access-requests/organizations` public organization access request
- `POST /access-requests/users/:id/approve` protected user approval
- `POST /access-requests/organizations/:id/approve` protected organization approval
- `POST /access-requests/users/:id/reject` protected user rejection
- `POST /access-requests/organizations/:id/reject` protected organization rejection
- `GET /invites` protected invite list
- `POST /invites` protected invite creation
- `POST /invites/accept` public invite acceptance after Supabase password/session setup
- `POST /invites/:id/revoke` protected invite revocation
- `GET /reference/practices` protected practice reference list
- `POST /reference/practices` protected practice reference creation
- `PATCH /reference/practices/:id` protected practice reference update
- `GET /reference/providers` protected provider reference list
- `POST /reference/providers` protected provider reference creation
- `PATCH /reference/providers/:id` protected provider reference update
- `GET /roles` protected role list
- `GET /roles/assignments` protected active role assignment list
- `POST /roles/assignments` protected role assignment creation
- `POST /roles/assignments/:id/revoke` protected role assignment revocation
- `GET /users` protected user list
- `GET /users/:id` protected user detail
- `PATCH /users/:id/disable` protected user disable
- `PATCH /users/:id/reactivate` protected user reactivation
- `GET /organizations` protected organization list
- `GET /organizations/:id` protected organization detail
- `POST /organizations` protected organization creation
- `PATCH /organizations/:id` protected organization update
- `PATCH /organizations/:id/status` protected organization status update
- `GET /care-coordinators/assignments` protected active care coordinator assignment list
- `POST /care-coordinators/assignments` protected care coordinator assignment creation
- `POST /care-coordinators/assignments/:id/revoke` protected care coordinator assignment revocation
- `GET /claims` protected Databricks read API
- `GET /providers` protected Databricks read API
- `GET /patient-metrics` protected Databricks read API

The Databricks module is consumed by the data controllers through a query service. The first read routes support these optional query parameters:

- `organizationId`
- `practiceId`
- `providerId`
- `patientId`
- `fromDate`
- `toDate`
- `limit`
- `offset`
- `includeResultChunks`

The data routes return the raw Databricks statement payload under `data` and API pagination metadata under `page`. `limit` and `offset` control SQL-level pagination. `includeResultChunks=true` asks the backend to hydrate additional Databricks result chunks up to `DATABRICKS_MAX_RESULT_CHUNKS`; `page.hasMoreResultChunks` tells the client when Databricks still reported another internal chunk.

Databricks table names are configured with:

- `DATABRICKS_CLAIMS_TABLE`
- `DATABRICKS_PROVIDERS_TABLE`
- `DATABRICKS_PATIENT_METRICS_TABLE`

Databricks statement execution now polls `PENDING` and `RUNNING` statements until a terminal state is reached or `DATABRICKS_POLL_MAX_ATTEMPTS` is exceeded. Polling and optional chunk fetching are configured with:

- `DATABRICKS_POLL_MAX_ATTEMPTS`
- `DATABRICKS_POLL_INTERVAL_MS`
- `DATABRICKS_MAX_RESULT_CHUNKS`

For non-platform roles, the data query service adds SQL filters from the authenticated user's role assignments before request filters are added. `developer` and `superAdmin` are platform roles and can query without role-scope SQL constraints.

The audit module is service-only. It is now called by approval, invite, practice, and provider write flows.

## Invite Acceptance Flow

Invite creation stores only a hashed invite token. The raw `inviteToken` is returned once from `POST /invites` so the UI or email layer can send it to the invited user.

Acceptance uses:

- `inviteToken`
- `accessToken`

The `accessToken` is the Supabase access token produced after the invited user signs in or completes password setup. `POST /invites/accept` verifies that token with Supabase, checks that the Supabase email matches the invite email, activates or creates the application profile, assigns the invite roles, marks the invite as accepted, and records an audit log.

## Cache Layer

The cache layer has an in-memory driver, a Redis driver, and a small `CacheService` wrapper.

Current intent:

- cache temporary Databricks statement results
- keep controllers/services independent of the concrete cache driver
- use in-memory cache by default
- use Redis when `CACHE_DRIVER=redis` and `REDIS_URL` are configured

The first Databricks statement cache TTL is 60 seconds.

Local Redis runtime testing is documented in `docs/deployment.md`. Docker Compose runs the API with `CACHE_DRIVER=redis` and `REDIS_URL=redis://redis:6379` while leaving normal local development free to use in-memory caching.

## Middleware

`RequestContextMiddleware` runs for every route.

It adds:

- `requestId`
- `x-request-id` response header

This gives every request a traceable identifier for logs and future audit workflows.

## Auth Guard

`AuthGuard` is registered globally.

Protected routes require a Supabase bearer token:

```text
Authorization: Bearer <supabase-access-token>
```

Routes decorated with `@Public()` skip authentication.

## ACL Guard

`AclGuard` is registered globally.

Routes can declare permissions with:

```ts
@RequirePermission('claims.read')
```

The guard calls the central ACL service:

```ts
can({ user, action, scope })
```

The ACL service currently has the base shape only. It allows platform roles such as `developer` and `superAdmin`, and it contains the first scoped-access comparison logic. Role loading from the database will be added in the next implementation step.

## User Context Loading

Protected requests now resolve user context in two stages:

1. Supabase validates the bearer access token.
2. Prisma loads the matching application profile and active role assignments.

Only `active` application profiles are allowed through protected routes. Pending, invited, rejected, and disabled users need dedicated onboarding or admin flows before they can access protected APIs.

## Scoped Admin Reads

Top-level user, organization, reference, role-assignment, and care-coordinator-assignment reads now use the authenticated user's role assignments:

- `developer` and `superAdmin` can read across the platform.
- Other roles read only records tied to their assigned `organizationId`.
- User reads also include the caller's own profile.

## Why This Structure

- Controllers own HTTP routing.
- Guards own access decisions.
- Decorators attach route metadata.
- Middleware owns request context.
- Services own business logic and external integrations.

This keeps the API scalable without mixing routing, auth, and business logic in one place.
