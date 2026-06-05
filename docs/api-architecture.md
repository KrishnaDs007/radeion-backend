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
- `GET /roles` protected role list
- `GET /users` protected placeholder
- `GET /organizations` protected placeholder
- `GET /claims` protected placeholder
- `GET /providers` protected placeholder
- `GET /patient-metrics` protected placeholder

The Databricks module is service-only for now. It will be consumed by the data controllers once ACL-scoped query building is implemented.

The audit module is service-only for now. It will be called by admin mutation APIs when approval, invite, organization, role assignment, practice, and provider write flows are implemented.

## Cache Layer

The cache layer starts with an in-memory driver and a small `CacheService` wrapper.

Current intent:

- cache temporary Databricks statement results
- keep controllers/services independent of the concrete cache driver
- allow Redis to replace the in-memory driver later

The first Databricks statement cache TTL is 60 seconds.

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

## Why This Structure

- Controllers own HTTP routing.
- Guards own access decisions.
- Decorators attach route metadata.
- Middleware owns request context.
- Services own business logic and external integrations.

This keeps the API scalable without mixing routing, auth, and business logic in one place.
