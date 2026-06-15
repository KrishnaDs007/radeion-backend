# Radeion Backend

Radeion Backend is a Node.js backend project for a healthcare-focused platform with Supabase-based authentication, multi-level user management, Databricks data access, and temporary data caching.

The project is being developed as both a learning journey and a production-oriented backend foundation.

## Project Direction

This backend is intended to support healthcare data products and applications, similar in spirit to platforms that serve multiple business users, administrators, and data-facing applications across organizations.

Planned consumers may include:

- Web applications
- Mobile applications
- Browser extensions
- Internal dashboards
- Healthcare data workflows

## Current Scope

The current backend foundation includes:

- NestJS API modules for auth, onboarding, admin management, reference data, care coordinator assignments, and Databricks reads
- Supabase Auth integration with application profiles and database-backed role context
- Multi-level user and role management with scoped organization access
- Developer and super admin platform access models
- User and organization access request approval workflows
- Invite creation, revocation, acceptance, and optional invite email delivery
- Practice/provider reference data APIs, including nested practice/provider reads
- Databricks read-focused APIs for claims, providers, and patient metrics
- Personal saved Databricks query presets
- Configurable Databricks table and column mappings for production schemas
- Temporary in-memory caching with Redis support
- Audit logging for current admin mutation flows
- Docker, Docker Compose Redis, and production Compose scaffolding
- GitHub Actions validation for Prisma, TypeScript, lint, docs, build, tests, e2e tests, and audit

## Role Direction

Current role model:

- `developer`: technical owner role with full system, debug, data, and backend access.
- `superAdmin`: non-developer business/admin role for managing companies, admins, users, and platform-level operations.
- `clientAdmin` and `acoAdmin`: organization/client-level administration within authorized scope.
- `careCoordinator`, `practice`, and `provider`: healthcare operational roles with scoped data access.

The developer role is intended for real developers only. Super admins may be non-technical users and may grow from a small group to a larger operational team over time.

## Authentication And Access

Authentication uses Supabase Auth bearer tokens. The backend loads the matching application profile and active role assignments from Supabase Postgres through Prisma, then applies route permissions and scoped filters.

The backend provides APIs for:

- public signup/access requests
- protected approval and rejection flows
- invite-based onboarding
- user disable/reactivation
- role assignment and revocation

## Data Direction

Version 1 primarily reads data from Databricks, then exposes authorized data APIs for different application surfaces. Databricks credentials and SQL execution stay server-side.

Write operations, scheduled sync jobs, and more advanced data workflows may be added later as requirements mature.

## Caching And Runtime

The project uses in-memory caching by default for learning and simplicity. Redis is available through `CACHE_DRIVER=redis` and `REDIS_URL` without rewriting the core API flow.

Runtime environment validation checks required Supabase, database, Databricks, cache, email, and numeric settings at application boot.

## Development Status

This repository now has the first backend foundation in place:

- Public and protected route coverage with unit and e2e tests
- API examples and Postman collection under `docs/`
- Local-only learning notes under `learning-notes/`
- Deployment guide and Docker runtime scaffolding
- CI configured with dummy non-secret app environment values for validation

See `docs/project-status.md` for the detailed progress tracker and `docs/deployment.md` for the first deployment guide.

## Local Development

```powershell
npm install
npx prisma generate
npm run start:dev
```

Useful checks:

```powershell
npm run prisma:validate
npx tsc --noEmit
npm run lint:check
npm run docs:validate
npm run build
npm test
npm run test:e2e
npm audit --audit-level=moderate
```

## Creator

**Krishna Devashish** _Senior Software Developer_

Email: [krishnadevashish17@gmail.com](mailto:krishnadevashish17@gmail.com) | Phone: +91 7978423156

Portfolio: [krishnasportfolio-rho.vercel.app](https://krishnasportfolio-rho.vercel.app/) | LinkedIn: [mrkd007](https://www.linkedin.com/in/mrkd007/)
