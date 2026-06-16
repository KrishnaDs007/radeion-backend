# Pending Backend Work

This file tracks backend-only pending work. Frontend screens are intentionally excluded.

## Backend API Status

There are no currently defined backend API endpoints waiting to be implemented from the active project tracker.

The backend already exposes the support APIs needed by the current onboarding and admin review flows:

- `POST /access-requests/users`
- `POST /access-requests/organizations`
- `GET /access-requests/users`
- `GET /access-requests/organizations`
- `POST /access-requests/users/:id/retry`
- `POST /access-requests/organizations/:id/retry`
- `POST /auth/password-recovery`
- `POST /invites/preview`
- `POST /invites/accept`

## External Backend Blockers

Databricks production mappings:

- Waiting for final production Databricks table names.
- Waiting for final production Databricks column names.
- Backend support already exists through environment variables and validation.

GitHub publishing:

- Waiting for GitHub CLI authentication or connector permission changes.
- Backend code changes are not required for PR creation.

Supabase recovery email delivery:

- Waiting for a reachable Supabase project URL, valid Supabase Auth email settings, and an allowed `PASSWORD_RECOVERY_REDIRECT_URL`.
- Backend support already exists through `POST /auth/password-recovery`.

## Future API Candidates

These are not active TODOs. Add them only when a concrete product workflow needs them:

- Additional child routes under organizations, practices, providers, users, or roles.
- Databricks write/sync APIs for practice/provider reference data.
- Bulk import/export APIs for admin operations.
- Admin-facing access request detail APIs or richer filtering/export workflows beyond the current list, approval, and retry flows.
- Operational diagnostics beyond `/health/config`, `/health/database`, and `/health/cache`.

## Documentation Status

Current API documentation lives in:

- `docs/project-status.md`
- `docs/api-architecture.md`
- `docs/api-examples.md`
- `docs/postman/radeion-backend.postman_collection.json`

Run this after API or docs changes:

```powershell
npm run docs:validate
```
