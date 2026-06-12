# API Request Examples

Use these examples while developing locally.

## Variables

```bash
API_BASE_URL=http://localhost:3000
SUPABASE_ACCESS_TOKEN=replace-with-supabase-access-token
```

Protected routes require:

```http
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
Content-Type: application/json
```

## Health

```bash
curl "$API_BASE_URL/health"
curl "$API_BASE_URL/health/config"
curl "$API_BASE_URL/health/database"
curl "$API_BASE_URL/auth/methods"
```

`GET /health/config` returns presence booleans and safe mode values only. It does not expose secret values:

```json
{
  "supabase": {
    "url": true,
    "publishableKey": true,
    "secretKey": true
  },
  "database": {
    "databaseUrl": true,
    "directUrl": true
  },
  "databricks": {
    "host": true,
    "token": true,
    "httpPath": true,
    "warehouseId": false,
    "tables": {
      "claims": true,
      "providers": true,
      "patientMetrics": true
    },
    "columnMappings": {
      "claims": true,
      "providers": true,
      "patientMetrics": true
    }
  },
  "cache": {
    "driver": "memory"
  },
  "email": {
    "driver": "disabled",
    "from": false,
    "resendApiKey": false,
    "inviteAcceptUrl": true
  }
}
```

## Public Access Requests

Create an organization access request:

```bash
curl -X POST "$API_BASE_URL/access-requests/organizations" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationName": "Example Health ACO",
    "requestedByEmail": "admin@example.org",
    "type": "aco",
    "website": "https://example.org",
    "contactEmail": "admin@example.org",
    "contactNumber": "+15555550100",
    "address": "100 Example Street",
    "companyBio": "Example healthcare organization",
    "startedYear": 2015
  }'
```

Create a user access request:

```bash
curl -X POST "$API_BASE_URL/access-requests/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider@example.org",
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "requestedRoles": ["provider"],
    "requestedScope": {
      "type": "organization",
      "organizationId": "00000000-0000-0000-0000-000000000000"
    }
  }'
```

## Approval APIs

Approve an organization request:

```bash
curl -X POST "$API_BASE_URL/access-requests/organizations/<requestId>/approve" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Health ACO",
    "type": "aco",
    "contactEmail": "admin@example.org"
  }'
```

Reject a user request:

```bash
curl -X POST "$API_BASE_URL/access-requests/users/<requestId>/reject" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewNotes": "Organization could not be verified"
  }'
```

## Invites

Create an invite:

```bash
curl -X POST "$API_BASE_URL/invites" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "care-coordinator@example.org",
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "assignedRoles": ["careCoordinator"],
    "assignedScope": {
      "type": "organization",
      "organizationId": "00000000-0000-0000-0000-000000000000"
    }
  }'
```

The response returns `inviteToken` once and includes `emailDelivery.status`. Local development skips email delivery unless `EMAIL_DRIVER=resend` is configured. After the invitee signs in or sets a password through Supabase, accept the invite:

```bash
curl -X POST "$API_BASE_URL/invites/accept" \
  -H "Content-Type: application/json" \
  -d '{
    "inviteToken": "replace-with-invite-token",
    "accessToken": "replace-with-invitee-supabase-access-token"
  }'
```

Revoke an invite:

```bash
curl -X POST "$API_BASE_URL/invites/<inviteId>/revoke" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

## Organizations

```bash
curl "$API_BASE_URL/organizations" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/organizations/<organizationId>" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/organizations/<organizationId>/practices" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/organizations/<organizationId>/users" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Create an organization directly:

```bash
curl -X POST "$API_BASE_URL/organizations" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Client",
    "type": "client",
    "website": "https://client.example.org",
    "contactEmail": "ops@client.example.org",
    "startedYear": 2020
  }'
```

Update organization status:

```bash
curl -X PATCH "$API_BASE_URL/organizations/<organizationId>/status" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "disabled",
    "reason": "Contract ended"
  }'
```

## Users And Roles

```bash
curl "$API_BASE_URL/users" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/users/<profileId>" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/roles" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/roles/assignments" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Assign a role:

```bash
curl -X POST "$API_BASE_URL/roles/assignments" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "00000000-0000-0000-0000-000000000000",
    "roleName": "provider",
    "scopeType": "organization",
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "reason": "Provider onboarding"
  }'
```

Disable a user:

```bash
curl -X PATCH "$API_BASE_URL/users/<profileId>/disable" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "No longer with client"
}'
```

## Audit Logs

Platform admins can read audit logs with filters and page metadata:

```bash
curl "$API_BASE_URL/audit-logs?action=organization.created&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Filter by actor, organization, target, or time range:

```bash
curl "$API_BASE_URL/audit-logs?organizationId=<organizationId>&fromDate=2026-06-01T00:00:00.000Z&toDate=2026-06-12T23:59:59.999Z" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

## Reference Data

Read practice and provider reference data:

```bash
curl "$API_BASE_URL/reference/practices" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/reference/practices/<practiceId>" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/reference/practices/<practiceId>/providers" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/reference/providers" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/reference/providers/<providerId>" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Create a practice:

```bash
curl -X POST "$API_BASE_URL/reference/practices" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "name": "Example Practice",
    "source": "manual"
  }'
```

Create a provider:

```bash
curl -X POST "$API_BASE_URL/reference/providers" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "practiceId": "00000000-0000-0000-0000-000000000000",
    "name": "Dr. Example",
    "npi": "1234567890",
    "source": "manual"
  }'
```

## Care Coordinator Assignments

Create an assignment:

```bash
curl -X POST "$API_BASE_URL/care-coordinators/assignments" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "00000000-0000-0000-0000-000000000000",
    "organizationId": "00000000-0000-0000-0000-000000000000",
    "practiceId": "00000000-0000-0000-0000-000000000000",
    "providerId": "00000000-0000-0000-0000-000000000000"
  }'
```

List assignments for one practice or provider:

```bash
curl "$API_BASE_URL/care-coordinators/practices/<practiceId>/assignments" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/care-coordinators/providers/<providerId>/assignments" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

## Databricks Data Reads

```bash
curl "$API_BASE_URL/claims?organizationId=<organizationId>&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/providers?practiceId=<practiceId>&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

curl "$API_BASE_URL/patient-metrics?providerId=<providerId>&fromDate=2026-01-01&toDate=2026-01-31" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Sort reads with public field names that map to configured Databricks columns:

```bash
curl "$API_BASE_URL/claims?organizationId=<organizationId>&sortBy=date&sortDirection=desc&limit=50" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

Ask the backend to fetch Databricks result chunks and return page metadata:

```bash
curl "$API_BASE_URL/claims?limit=100&offset=0&includeResultChunks=true" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
```

The response shape is:

```json
{
  "data": {
    "statement_id": "databricks-statement-id",
    "status": {
      "state": "SUCCEEDED"
    },
    "result": {},
    "result_chunks": []
  },
  "page": {
    "limit": 100,
    "offset": 0,
    "returnedRowCount": 0,
    "nextOffset": null,
    "hasNextPage": false,
    "includedResultChunks": true,
    "resultChunkCount": 0,
    "hasMoreResultChunks": false
  }
}
```
