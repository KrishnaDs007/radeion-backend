# Schema Design

This document describes the initial database and authorization model for Radeion Backend.

The schema is intended for Supabase Postgres as the primary application database. Supabase Auth manages authentication identities, while application tables manage profiles, organizations, roles, scopes, approvals, reference records, and audit logs.

## Design Goals

- Support multiple organizations.
- Support users with multiple roles.
- Support global and organization/domain-scoped access.
- Support healthcare domain hierarchy: organizations, practices, providers, care coordinators, ACO admins, client admins, super admins, and developers.
- Keep Databricks access server-side.
- Use ACL checks for both user management and Databricks data APIs.
- Start with in-memory cache while leaving room for Redis.
- Track admin and configuration audit events from the beginning.

## Authentication Boundary

Supabase Auth owns login identity and email verification.

Application profile records are created only after email verification. Signup requests, rejected requests, declined requests, and failed attempts should still be tracked separately so the system does not lose approval history.

## User Statuses

Initial user status values:

- `pending`: signup submitted and waiting for approval.
- `invited`: invited user has not completed password setup or onboarding.
- `active`: user can access the application.
- `rejected`: signup or access request was denied.
- `disabled`: user was removed, blocked, or deactivated by an admin.

## Core Tables

### profiles

Application-level user profile linked to a verified Supabase Auth user.

Suggested fields:

- `id`
- `auth_user_id`
- `email`
- `first_name`
- `last_name`
- `status`
- `created_at`
- `updated_at`

Notes:

- `auth_user_id` references Supabase Auth user identity.
- Profiles should be created after email verification.

### organizations

Top-level client or account container.

Suggested fields:

- `id`
- `name`
- `type`
- `website`
- `contact_email`
- `contact_number`
- `status`
- `address`
- `company_bio`
- `started_year`
- `created_by`
- `created_at`
- `updated_at`

Notes:

- `type` should remain flexible because business terminology may change.
- Organization creation can happen directly by super admins or through signup/onboarding requests.

### organization_approval_requests

Tracks pending organization creation or onboarding requests.

Suggested fields:

- `id`
- `organization_name`
- `requested_by_email`
- `requested_by_auth_user_id`
- `requested_payload`
- `status`
- `reviewed_by`
- `reviewed_at`
- `review_notes`
- `created_at`
- `updated_at`

### user_approval_requests

Tracks signup/access requests for users.

Suggested fields:

- `id`
- `auth_user_id`
- `email`
- `organization_id`
- `requested_roles`
- `requested_scope`
- `status`
- `reviewed_by`
- `reviewed_at`
- `review_notes`
- `created_at`
- `updated_at`

Notes:

- Signup users require approval.
- Rejected and declined requests should be retained.

### invites

Tracks invited users.

Suggested fields:

- `id`
- `email`
- `organization_id`
- `invited_by`
- `assigned_roles`
- `assigned_scope`
- `status`
- `expires_at`
- `accepted_at`
- `created_at`
- `updated_at`

Notes:

- Invited users become active after setting a password.
- Admins can disable or remove invited users later.

## Roles and Access

### roles

Defines role names and high-level role metadata.

Suggested fields:

- `id`
- `name`
- `display_name`
- `description`
- `is_global`
- `created_at`
- `updated_at`

Initial role names:

- `provider`
- `practice`
- `careCoordinator`
- `acoAdmin`
- `clientAdmin`
- `superAdmin`
- `developer`

Notes:

- A user can have multiple roles.
- `developer` and `superAdmin` are global Radeion-side roles.
- Client/domain roles are usually scoped.

### user_role_assignments

Maps users to roles and scopes.

Suggested fields:

- `id`
- `profile_id`
- `role_id`
- `scope_type`
- `scope_id`
- `organization_id`
- `assigned_by`
- `created_at`
- `revoked_at`

Notes:

- Use one row per role and scope assignment.
- Multi-organization access is allowed but should require super admin approval.
- Example `scope_type` values: `global`, `organization`, `aco`, `practice`, `provider`.

## Healthcare Reference Records

### practices

Reference records used for authorization and data filtering.

Suggested fields:

- `id`
- `organization_id`
- `name`
- `external_reference_id`
- `source`
- `status`
- `created_at`
- `updated_at`

Notes:

- Practices can be manually managed or synced from Databricks.

### providers

Reference records used for authorization and data filtering.

Suggested fields:

- `id`
- `organization_id`
- `practice_id`
- `name`
- `npi`
- `external_reference_id`
- `source`
- `status`
- `created_at`
- `updated_at`

Notes:

- A practice can have multiple providers.
- Providers can be manually managed or synced from Databricks.

### care_coordinator_assignments

Maps care coordinators to practices and optionally providers.

Suggested fields:

- `id`
- `profile_id`
- `organization_id`
- `practice_id`
- `provider_id`
- `assigned_by`
- `created_at`
- `revoked_at`

Notes:

- A care coordinator can manage multiple practices.
- Provider-specific assignment is optional when practice-level scope is enough.

## ACL Direction

Use action-based permissions in code for v1, with roles and assignments stored in the database.

Example actions:

- `user.approve`
- `user.disable`
- `role.assign`
- `organization.create`
- `organization.approve`
- `organization.update`
- `claims.read`
- `providers.read`
- `patientMetrics.read`

The ACL service should evaluate:

- user status
- assigned roles
- role scope
- requested action
- requested resource scope

The preferred service shape is:

```ts
can(userContext, action, resourceScope)
```

## Databricks Data APIs

V1 Databricks-backed endpoints:

- `/claims`
- `/providers`
- `/patient-metrics`

Databricks credentials and queries must stay server-side. The backend should compute the user's allowed scope before querying Databricks.

## Audit Logs

Audit logs are required from the beginning for admin and configuration actions.

Suggested fields:

- `id`
- `actor_profile_id`
- `action`
- `target_type`
- `target_id`
- `organization_id`
- `metadata`
- `created_at`

Initial audit scope:

- user approvals
- user rejections
- user disables
- role assignments
- role revocations
- organization creation
- organization approval
- invite creation
- practice/provider admin changes

Sensitive Databricks read auditing can be added later.

## Cache Direction

V1 starts with in-memory caching. The cache implementation should be wrapped behind a service so Redis can be added later without rewriting route handlers or Databricks services.

