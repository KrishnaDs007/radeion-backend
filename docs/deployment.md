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
- `DATABRICKS_PROVIDERS_TABLE`
- `DATABRICKS_PATIENT_METRICS_TABLE`
- `DATABRICKS_POLL_MAX_ATTEMPTS`
- `DATABRICKS_POLL_INTERVAL_MS`
- `DATABRICKS_MAX_RESULT_CHUNKS`
- `CACHE_DRIVER`
- `REDIS_URL`

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
```

`/health/config` reports whether required secrets are present without exposing the secret values.

