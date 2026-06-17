# API Architecture

This project uses NestJS modules, controllers, middleware, guards, decorators, and services instead of a separate Express router folder.

## Routing Model

NestJS controllers act as route groups.

Current route groups:

- `GET /` public health-style root
- `GET /health` public health status
- `GET /health/config` public config-presence status without secret values
- `GET /health/database` public database connectivity status
- `GET /health/cache` public cache round-trip status
- `GET /health/email` public email-delivery readiness and password-recovery config status
- `GET /auth/methods` public auth configuration
- `POST /auth/password-recovery` public Supabase password recovery email request
- `POST /access-requests/users` public user access request
- `POST /access-requests/organizations` public organization access request
- `GET /access-requests/users` protected user access request list
- `GET /access-requests/organizations` protected organization access request list
- `GET /access-requests/users/:id` protected user access request detail
- `GET /access-requests/organizations/:id` protected organization access request detail
- `POST /access-requests/users/:id/retry` public user access request retry
- `POST /access-requests/organizations/:id/retry` public organization access request retry
- `POST /access-requests/users/:id/approve` protected user approval
- `POST /access-requests/organizations/:id/approve` protected organization approval
- `POST /access-requests/users/:id/reject` protected user rejection
- `POST /access-requests/organizations/:id/reject` protected organization rejection
- `GET /invites` protected invite list
- `POST /invites` protected invite creation
- `POST /invites/preview` public limited invite lookup before Supabase session setup
- `POST /invites/accept` public invite acceptance after Supabase password/session setup
- `POST /invites/:id/revoke` protected invite revocation
- `GET /reference/practices` protected practice reference list
- `GET /reference/practices/:id` protected practice reference detail
- `GET /reference/practices/:id/providers` protected providers inside one practice
- `POST /reference/practices` protected practice reference creation
- `PATCH /reference/practices/:id` protected practice reference update
- `GET /reference/providers` protected provider reference list
- `GET /reference/providers/:id` protected provider reference detail
- `POST /reference/providers` protected provider reference creation
- `PATCH /reference/providers/:id` protected provider reference update
- `GET /roles` protected role list
- `GET /roles/assignments` protected active role assignment list
- `POST /roles/assignments` protected role assignment creation
- `POST /roles/assignments/:id/revoke` protected role assignment revocation
- `GET /audit-logs` protected platform audit log list
- `GET /users` protected user list
- `GET /users/:id` protected user detail
- `PATCH /users/:id/disable` protected user disable
- `PATCH /users/:id/reactivate` protected user reactivation
- `GET /organizations` protected organization list
- `GET /organizations/:id` protected organization detail
- `GET /organizations/:id/practices` protected organization practice list
- `GET /organizations/:id/providers` protected organization provider list
- `GET /organizations/:id/users` protected organization user list
- `POST /organizations` protected organization creation
- `PATCH /organizations/:id` protected organization update
- `PATCH /organizations/:id/status` protected organization status update
- `GET /care-coordinators/assignments` protected active care coordinator assignment list
- `GET /care-coordinators/organizations/:organizationId/assignments` protected organization-specific care coordinator assignment list
- `GET /care-coordinators/practices/:practiceId/assignments` protected practice-specific care coordinator assignment list
- `GET /care-coordinators/providers/:providerId/assignments` protected provider-specific care coordinator assignment list
- `POST /care-coordinators/assignments` protected care coordinator assignment creation
- `POST /care-coordinators/assignments/:id/revoke` protected care coordinator assignment revocation
- `GET /claims` protected Databricks read API
- `GET /providers` protected Databricks read API
- `GET /patient-metrics` protected Databricks read API
- `GET /data-query-presets` protected personal saved query preset list
- `POST /data-query-presets` protected personal saved query preset creation
- `PATCH /data-query-presets/:id` protected personal saved query preset update
- `DELETE /data-query-presets/:id` protected personal saved query preset deletion

The Databricks module is consumed by the data controllers through a query service. The first read routes support these optional query parameters:

- `organizationId`
- `practiceId`
- `providerId`
- `patientId`
- `fromDate`
- `toDate`
- `sortBy`
- `sortDirection`
- `limit`
- `offset`
- `includeResultChunks`

The data routes return the raw Databricks statement payload under `data` and API pagination metadata under `page`. `limit` and `offset` control SQL-level pagination. `sortBy` accepts `organizationId`, `practiceId`, `providerId`, `patientId`, or `date`; `sortDirection` accepts `asc` or `desc` and defaults to `asc`. Sorting maps those public field names to configured, validated Databricks columns before adding `ORDER BY`. `includeResultChunks=true` asks the backend to hydrate additional Databricks result chunks up to `DATABRICKS_MAX_RESULT_CHUNKS`; `page.hasMoreResultChunks` tells the client when Databricks still reported another internal chunk.

Databricks table names are configured with:

- `DATABRICKS_CLAIMS_TABLE`
- `DATABRICKS_PROVIDERS_TABLE`
- `DATABRICKS_PATIENT_METRICS_TABLE`

Databricks filter column names are also configurable per dataset. Use the matching `*_ORGANIZATION_ID_COLUMN`, `*_PRACTICE_ID_COLUMN`, `*_PROVIDER_ID_COLUMN`, `*_PATIENT_ID_COLUMN`, and dataset date column variables from `.env.example` when production schemas differ from the local defaults.

Databricks statement execution now polls `PENDING` and `RUNNING` statements until a terminal state is reached or `DATABRICKS_POLL_MAX_ATTEMPTS` is exceeded. Polling and optional chunk fetching are configured with:

- `DATABRICKS_POLL_MAX_ATTEMPTS`
- `DATABRICKS_POLL_INTERVAL_MS`
- `DATABRICKS_MAX_RESULT_CHUNKS`

For non-platform roles, the data query service adds SQL filters from the authenticated user's role assignments before request filters are added. `developer` and `superAdmin` are platform roles and can query without role-scope SQL constraints.

The audit module records write/read events and exposes a platform-only list API at `GET /audit-logs`.

Audit log reads support these optional query parameters:

- `actorProfileId`
- `action`
- `targetType`
- `targetId`
- `organizationId`
- `fromDate`
- `toDate`
- `limit`
- `offset`

The route requires `audit.read`. Because the ACL check has no resource scope, only platform roles such as `developer` and `superAdmin` can read it.

Databricks read audit records use `action=data.read` and `targetType=dataQuery`. They store dataset/table/page metadata, sort metadata, and filter presence flags, but avoid raw SQL and sensitive filter values such as patient IDs.

Data query presets store reusable query shapes for the authenticated user. Presets support `claims`, `providers`, and `patientMetrics` datasets, store the validated query object as JSON, and can optionally be attached to an organization. Users can only list, update, and delete their own presets. Non-platform users can only attach presets to organizations already present in their active role assignments.

## Configuration Health

`GET /health/config` returns configuration presence and selected non-secret mode values without exposing secrets.

It reports:

- Supabase key presence
- database URL presence
- Databricks host/token/path presence
- Databricks table and column mapping presence
- cache driver
- email driver and invite email setting presence

`GET /health/cache` performs a short cache round trip through the configured cache driver and returns:

- `connected`
- `driver`

It can be used to verify either the default in-memory cache or a Redis-backed deployment without touching application data.

`GET /health/email` reports non-secret email delivery readiness:

- `driver`
- `inviteDelivery.configured`
- `inviteDelivery.ready`
- `inviteDelivery.requires`
- `passwordRecovery.configured`
- `passwordRecovery.redirectUrl`

It does not test third-party inbox delivery or expose API keys. For `EMAIL_DRIVER=resend`, `inviteDelivery.requires` lists any missing required variables such as `EMAIL_FROM` or `RESEND_API_KEY`.

## Invite Acceptance Flow

Invite preview lets the future onboarding UI verify an invite link before the invitee has a Supabase session:

- `POST /invites/preview`
- body: `inviteToken`

The response intentionally returns only limited public fields: email, organization id, status, expiration time, and accepted time. It does not expose token hashes, assigned roles, assigned scopes, inviter details, or audit metadata.

If a pending invite is already past `expiresAt`, preview marks it `expired` before returning the response.

## Password Recovery Flow

`POST /auth/password-recovery` accepts an email address and asks Supabase to send a password recovery email. The response is intentionally generic so callers cannot use the endpoint to discover whether an email address has an account.

Recovery redirects are configured server-side with `PASSWORD_RECOVERY_REDIRECT_URL`; public callers do not supply redirect targets.

## Access Request Retry Flow

Public retry endpoints let the future onboarding UI reopen existing user or organization requests after a rejected, declined, or failed state. They reset review fields and move the request back to `pending`.

Retry requests require the same email as the original request:

- user retries compare `email`
- organization retries compare `requestedByEmail`

Pending and approved requests cannot be retried.

## Access Request Review Queues

Admins can list access requests before approving or rejecting them:

- `GET /access-requests/users`
- `GET /access-requests/organizations`
- `GET /access-requests/users/:id`
- `GET /access-requests/organizations/:id`

Both routes support these optional query parameters:

- `status`
- `email`
- `limit`
- `offset`

`GET /access-requests/users` also supports:

- `organizationId`

Both list routes return a `data` array and `page` metadata with `limit`, `offset`, `total`, `nextOffset`, and `hasNextPage`.

The detail routes return one request record with the same nested reviewer and organization fields used in the list responses.

The list routes require `user.approve` or `organization.approve`, which means they are effectively limited to platform roles in the current ACL implementation because the checks are not resource-scoped.

Invite creation stores only a hashed invite token. The raw `inviteToken` is returned once from `POST /invites` so the UI or a fallback admin workflow can send it to the invited user.

When `EMAIL_DRIVER=resend`, the API also attempts to deliver the invite email through the configured Resend endpoint. Local development defaults to `EMAIL_DRIVER=disabled`, which skips delivery and still returns the token. The invite creation response includes `emailDelivery.status` as `sent`, `skipped`, or `failed`.

Invite email delivery is configured with:

- `EMAIL_DRIVER`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `RESEND_API_URL`
- `INVITE_ACCEPT_URL`

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

The ACL service allows platform roles such as `developer` and `superAdmin`, and it applies scoped-access comparison logic for non-platform roles. Protected requests load active role assignments from the database before ACL checks run.

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
