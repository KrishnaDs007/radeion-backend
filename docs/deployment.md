# Deployment Guide

This guide captures the first deployment shape for the Radeion backend. It is intentionally simple so the same project can run locally with in-memory cache, locally with Redis, and later on a cloud runtime.

## Runtime Requirements

- Node.js 24
- npm
- Supabase project with Auth and Postgres
- Databricks SQL warehouse credentials
- Redis when `CACHE_DRIVER=redis`

## Required Environment

Use `.env.example` as the source of truth for names.

Required for the API:

- `NODE_ENV`
- `PORT`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN`
- `DATABRICKS_HTTP_PATH`

Optional or environment-specific:

- `DATABRICKS_WAREHOUSE_ID`
- `DATABRICKS_CLAIMS_TABLE`
- `DATABRICKS_CLAIMS_ORGANIZATION_ID_COLUMN`
- `DATABRICKS_CLAIMS_PRACTICE_ID_COLUMN`
- `DATABRICKS_CLAIMS_PROVIDER_ID_COLUMN`
- `DATABRICKS_CLAIMS_PATIENT_ID_COLUMN`
- `DATABRICKS_CLAIMS_DATE_COLUMN`
- `DATABRICKS_PROVIDERS_TABLE`
- `DATABRICKS_PROVIDERS_ORGANIZATION_ID_COLUMN`
- `DATABRICKS_PROVIDERS_PRACTICE_ID_COLUMN`
- `DATABRICKS_PROVIDERS_PROVIDER_ID_COLUMN`
- `DATABRICKS_PROVIDERS_PATIENT_ID_COLUMN`
- `DATABRICKS_PATIENT_METRICS_TABLE`
- `DATABRICKS_PATIENT_METRICS_ORGANIZATION_ID_COLUMN`
- `DATABRICKS_PATIENT_METRICS_PRACTICE_ID_COLUMN`
- `DATABRICKS_PATIENT_METRICS_PROVIDER_ID_COLUMN`
- `DATABRICKS_PATIENT_METRICS_PATIENT_ID_COLUMN`
- `DATABRICKS_PATIENT_METRICS_DATE_COLUMN`
- `DATABRICKS_POLL_MAX_ATTEMPTS`
- `DATABRICKS_POLL_INTERVAL_MS`
- `DATABRICKS_MAX_RESULT_CHUNKS`
- `CACHE_DRIVER`
- `REDIS_URL`

## Environment Validation

The app validates important environment values during NestJS boot through `src/config/env.validation.ts`.

Validation checks:

- required Supabase, database, and Databricks keys are present
- `SUPABASE_URL`, `DATABASE_URL`, `DIRECT_URL`, and `REDIS_URL` have valid URL shapes when set
- `CACHE_DRIVER` is either `memory` or `redis`
- `REDIS_URL` is present when `CACHE_DRIVER=redis`
- `PORT` and Databricks numeric tuning values are non-negative integers when set
- Databricks table and column mappings are safe SQL identifiers or identifier paths

This does not test live connectivity. Use `/health/database` for database connectivity, `/health/email` for non-secret email readiness, `/health/databricks` for non-secret Databricks mapping readiness, and Databricks read routes for Databricks execution checks.

## Local Docker With Redis

Create `.env` from `.env.example`, then fill in Supabase and Databricks values.

```powershell
docker compose up --build
```

The compose file starts:

- `api` on `http://localhost:3000`
- `redis` on `localhost:6379`

The compose API service forces:

```text
CACHE_DRIVER=redis
REDIS_URL=redis://redis:6379
```

This lets you test the Redis cache driver without changing your normal local `.env`.

## Local Node Without Redis

Use the normal developer flow:

```powershell
npm install
npx prisma generate
npm run start:dev
```

For this mode, keep:

```text
CACHE_DRIVER=memory
REDIS_URL=
```

## Build Image

```powershell
docker build -t radeion-backend .
```

Run the built image with your environment file:

```powershell
docker run --env-file .env -p 3000:3000 radeion-backend
```

When using the single container command above, set `CACHE_DRIVER=memory` unless you also provide a reachable Redis URL.

## Production Docker Compose

`docker-compose.prod.yml` is a small production-oriented Compose file for a Docker host or VM.

It expects a production env file named:

```text
.env.production
```

That file should contain the same runtime keys described above. Do not commit it.

Build or pull the image, then run:

```powershell
docker compose -f docker-compose.prod.yml up -d
```

To choose a specific image tag:

```powershell
$env:RADEION_API_IMAGE="radeion-backend:latest"
docker compose -f docker-compose.prod.yml up -d
```

The production Compose file includes a container health check against `/health`. It does not start Redis for you; use a managed Redis URL or add a Redis service only in the deployment environment where that is intended.

## Cloud Deployment Notes

For a first cloud deployment, the backend can run on any Node or container platform that supports environment variables.

Recommended shape:

- API container or Node service runs `node dist/main.js`.
- Supabase Postgres stays external.
- Redis should be a managed Redis instance when `CACHE_DRIVER=redis`.
- Databricks credentials must be stored as runtime secrets, not committed files.
- Run Prisma migrations from a trusted deployment job or local admin machine, not from every API boot.

## Health Checks

Use:

```text
GET /health
GET /health/config
GET /health/database
GET /health/cache
GET /health/email
GET /health/databricks
```

`/health/config` reports whether required secrets are present without exposing the secret values.
`/health/cache` performs a small round trip against the configured cache driver, which is useful when validating Redis deployments.
`/health/email` reports whether invite email delivery is configured and which non-secret requirements are still missing.
`/health/databricks` reports whether Databricks connection variables, dataset tables, and dataset column mappings are configured without exposing their values.
