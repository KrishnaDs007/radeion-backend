# API Architecture

This project uses NestJS modules, controllers, middleware, guards, decorators, and services instead of a separate Express router folder.

## Routing Model

NestJS controllers act as route groups.

Current route groups:

- `GET /` public health-style root
- `GET /auth/methods` public auth configuration
- `GET /users` protected placeholder
- `GET /organizations` protected placeholder
- `GET /claims` protected placeholder
- `GET /providers` protected placeholder
- `GET /patient-metrics` protected placeholder

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

## Why This Structure

- Controllers own HTTP routing.
- Guards own access decisions.
- Decorators attach route metadata.
- Middleware owns request context.
- Services own business logic and external integrations.

This keeps the API scalable without mixing routing, auth, and business logic in one place.

