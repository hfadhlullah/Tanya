# Coolify Staging Deploy

This project's staging setup has four services:

1. `postgres`
2. `api`
3. `worker`
4. `admin`

## 1. Database + API + Worker

Recommended: create one **Docker Compose** resource in Coolify using the repo root `docker-compose.yml`.

### Compose services to enable

1. `postgres`
2. `api`
3. `worker`

Do not enable `migrate` as a long-running service. Run it as a one-off job during deploys.

### Staging environment variables

Use values based on `.env.staging.example`:

```env
API_PORT=3001
POSTGRES_DB=tanya_staging
POSTGRES_USER=tanya_staging
POSTGRES_PASSWORD=change-me-staging
DATABASE_URL=postgres://tanya_staging:change-me-staging@postgres:5432/tanya_staging
CORS_ORIGIN=https://staging-admin.example.com,https://staging-api.example.com
DEMO_ADMIN_KEY=replace-with-staging-admin-key
STORAGE_BASE_URL=https://staging-api.example.com/uploads
REQUESTY_API_KEY=replace-with-requesty-key
REQUESTY_BASE_URL=https://router.requesty.ai/v1
REQUESTY_EMBEDDING_MODEL=openai/text-embedding-3-small
REQUESTY_CHAT_MODEL=openai/gpt-4o-mini
```

Notes:

- `DATABASE_URL` must keep `@postgres:5432` inside Coolify compose networking.
- `CORS_ORIGIN` should include the staging admin URL and any web client URL that calls the API directly.
- Point your mobile staging build to the public API URL, not the internal compose hostname.

### Domains

Set the public domain for the `api` service, for example:

```text
https://staging-api.example.com
```

### Migrations

Run Prisma migrations on each staging deploy before or together with the API rollout:

```bash
docker compose --env-file .env.staging.example --profile migrate run --rm migrate
```

In Coolify, run the equivalent as a one-off command for the same repo/environment:

```bash
bunx prisma migrate deploy
```

## 2. Admin Site

Recommended: create a separate **Dockerfile / static site** resource in Coolify from `admin/`.

### Build settings

- Base directory: `admin`
- Dockerfile: `admin/Dockerfile`
- Port: `80`

### Required build variable

Because the admin app is a Vite static build, the API URL must be present at build time:

```env
VITE_API_URL=https://staging-api.example.com
```

### Domain

Set the public domain for the admin site, for example:

```text
https://staging-admin.example.com
```

## 3. Mobile Staging Build

Your Android staging APK should point to the deployed API:

```env
EXPO_PUBLIC_API_URL=https://staging-api.example.com
```

Do not use `localhost` in APK builds.

## 4. Smoke Test Checklist

After deployment:

1. Open `https://staging-api.example.com/health`
2. Open `https://staging-admin.example.com`
3. Log in to admin with `DEMO_ADMIN_KEY`
4. Confirm `admin/sensitive-rules` returns successfully
5. Test mobile against `EXPO_PUBLIC_API_URL=https://staging-api.example.com`
