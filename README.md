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

## Initial Scope

The first version will focus on:

- Node.js backend setup
- Supabase Auth integration
- Multi-level user and role management
- Super admin and developer access models
- Company/admin-level user approval workflows
- Databricks read-focused data APIs
- Temporary in-memory caching with future Redis support

## Role Direction

Initial role thinking:

- `developer`: technical owner role with full system, debug, data, and backend access.
- `superAdmin`: non-developer business/admin role for managing companies, admins, users, and platform-level operations.
- `admin`: company-level role that can approve and manage users within authorized scope.
- `user`: approved application user.

The developer role is intended for real developers only. Super admins may be non-technical users and may grow from a small group to a larger operational team over time.

## Authentication Direction

Authentication will use Supabase Auth with a mix of login methods. The backend will provide APIs for approval and authorization workflows so company admins and super admins can control access after signup.

## Data Direction

Version 1 will primarily read data from Databricks, then expose authorized data APIs for different application surfaces.

Write operations, scheduled sync jobs, and more advanced data workflows may be added later as requirements mature.

## Caching Direction

The project will start with in-memory caching for learning and simplicity. The structure should leave room to add Redis later without rewriting the core API flow.

## Development Status

This repository now has the first backend foundation in place:

- NestJS API modules for auth, onboarding, admin management, reference data, and Databricks reads
- Supabase Auth and Supabase Postgres integration through Prisma
- In-memory cache by default, with Redis available through the cache abstraction
- Docker and Docker Compose scaffolding for local Redis runtime testing
- GitHub Actions validation for Prisma, TypeScript, lint, build, tests, e2e tests, and audit

See `docs/project-status.md` for the detailed progress tracker and `docs/deployment.md` for the first deployment guide.

## Creator

**Krishna Devashish** _Senior Software Developer_

✉️ [krishnadevashish17@gmail.com](mailto:krishnadevashish17@gmail.com) | 📞 +91 7978423156

🌐 [Portfolio](https://krishnasportfolio-rho.vercel.app/) | 🔗 [LinkedIn](https://www.linkedin.com/in/mrkd007/)
