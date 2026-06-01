# Tanya

Islamic Q&A platform. NestJS backend (Bun) + Postgres (pgvector) + React Native/Expo mobile.

## Prerequisites

- Docker + Docker Compose
- Bun (`curl -fsSL https://bun.sh/install | bash`)

---

## 1. Backend (Docker)

```bash
cp .env.production.example .env
```

Edit `.env` with these values for local dev:

```env
API_PORT=3001
POSTGRES_DB=tanya_local
POSTGRES_USER=tanya_local
POSTGRES_PASSWORD=tanya_local
DATABASE_URL=postgres://tanya_local:tanya_local@postgres:5432/tanya_local
CORS_ORIGIN=*
DEMO_ADMIN_KEY=local-dev-admin-key
STORAGE_BASE_URL=http://localhost:3001/uploads
```

```bash
# Build and start
docker compose up -d --build

# First time only: run migrations
docker compose --profile migrate run --rm migrate

# First time only: apply migration 000002 manually (non-standard folder name)
docker compose exec -e PGPASSWORD=tanya_local postgres psql -U tanya_local -d tanya_local \
  -c 'ALTER TABLE "Source" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;'

# First time only: seed demo user
docker compose run --rm \
  -e DATABASE_URL="postgres://tanya_local:tanya_local@postgres:5432/tanya_local" \
  api bunx prisma db seed
```

API runs at `http://localhost:3001`.

---

## 2. Seed Corpus

Answers require corpus chunks in the database. Use the admin API to add them.

```bash
# Create a source
curl -X POST http://localhost:3001/corpus/sources \
  -H "Content-Type: application/json" \
  -H "x-demo-admin-key: local-dev-admin-key" \
  -d '{
    "type": "HADITH",
    "title": "Hadits Pilihan",
    "reference": "Shahih Bukhari & Muslim",
    "license": "public domain",
    "language": "id"
  }'
# Response includes "id" — use it as SOURCE_ID below

# Add a chunk
curl -X POST http://localhost:3001/corpus/chunks \
  -H "Content-Type: application/json" \
  -H "x-demo-admin-key: local-dev-admin-key" \
  -d '{
    "sourceId": "SOURCE_ID",
    "topic": "sholat berjamaah",
    "content": "Sholat berjamaah lebih utama daripada sholat sendirian dengan dua puluh tujuh derajat (HR. Bukhari 645, Muslim 650)."
  }'
```

---

## 3. Mobile (Expo Web)

```bash
cd mobile
cp .env.example .env
```

Edit `mobile/.env`:

```env
# Use your machine's local IP (not localhost) to access from other devices on the same network
EXPO_PUBLIC_API_URL=http://192.168.x.x:3001
EXPO_PUBLIC_DEMO_USER_ID=demo-user
```

```bash
bun install
bunx expo start --web
```

- Local browser: `http://localhost:8081`
- Other devices on same WiFi: `http://<your-machine-ip>:8081`

---

## 4. LLM Integration

Not yet wired up — worker has a placeholder. Corpus retrieval currently uses plain text search. Add your API key to `.env` when ready.
