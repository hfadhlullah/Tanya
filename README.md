# Tanya

Islamic Q&A platform. NestJS backend + Postgres (pgvector) + React Native/Expo mobile + React admin panel.

## Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Bun 1.1+
- npm is still supported as a fallback where needed

---

## 1. Database (Docker)

Start only the Postgres container:

```bash
docker compose up -d postgres
```

Postgres runs at `172.x.x.x:5432` (container IP — not exposed to host by default).

Get the container IP:

```bash
docker inspect tanya-postgres-1 --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
```

---

## 2. Backend (NestJS)

```bash
cd backend
bun install
```

If you prefer npm:

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql://tanya_local:tanya_local@<CONTAINER_IP>:5432/tanya_local
JWT_SECRET=any-random-string
DEMO_ADMIN_KEY=your-admin-key
REQUESTY_API_KEY=
REQUESTY_BASE_URL=https://router.requesty.ai/v1
REQUESTY_EMBEDDING_MODEL=openai/text-embedding-3-small
REQUESTY_CHAT_MODEL=openai/gpt-4o-mini
CORS_ORIGIN=http://localhost:5174
```

> Replace `<CONTAINER_IP>` with the IP from step 1.

First time only — run migrations:

```bash
bun run db:migrate
```

If you prefer npm:

```bash
npx prisma migrate deploy
```

Generate Prisma client if needed:

```bash
bun run db:generate
```

Start backend API:

```bash
bun run start:dev
```

If you prefer npm:

```bash
npm run start:dev
```

API runs at `http://localhost:3001`.

Start worker in a second terminal:

```bash
bun run build
bun run start:worker
```

If you prefer npm:

```bash
npm run build
npm run start:worker
```

The worker is required for:
- corpus embedding jobs
- pgvector readiness for RAG retrieval
- background processing after corpus import

---

## 3. Mobile (Expo)

```bash
cd mobile
bun install
```

If you prefer npm:

```bash
cd mobile
npm install
```

Create `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Start Expo for web:

```bash
bun run web
```

If you prefer npm:

```bash
npm run web
```

- Browser: `http://localhost:8081`
- Other devices on same WiFi: use your machine's LAN IP instead of `localhost`

You can also start the generic Expo dev server with:

```bash
bun run start
```

### Ustadz flow

A user with role `USTADZ` in the DB gets routed to ustadz screens automatically on login.

---

## 4. Admin Panel

```bash
cd admin
bun install
```

If you prefer npm:

```bash
cd admin
npm install
```

Create `admin/.env`:

```env
VITE_API_URL=http://localhost:3001
```

Start admin panel:

```bash
bun run dev
```

If you prefer npm:

```bash
npm run dev
```

Admin panel runs at `http://localhost:5174`.

Login with the `DEMO_ADMIN_KEY` value you set in `backend/.env`.

### Admin features

- **Ustadz Applications** — review, approve, or reject ustadz registrations
- **Sensitive Rules** — manage content classification rules (global or per-ustadz)
- **Corpus Sources** — view loaded knowledge base sources and chunk counts
- **Audit Logs** — track all verification actions

---

## 5. Seed Corpus (optional)

Answers require corpus chunks in the database.

For full RAG behavior, keep the worker running so imported chunks receive embeddings.

```bash
# Create a source
curl -X POST http://localhost:3001/corpus/sources \
  -H "Content-Type: application/json" \
  -H "x-demo-admin-key: your-admin-key" \
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
  -H "x-demo-admin-key: your-admin-key" \
  -d '{
    "sourceId": "SOURCE_ID",
    "topic": "sholat berjamaah",
    "content": "Sholat berjamaah lebih utama daripada sholat sendirian dengan dua puluh tujuh derajat (HR. Bukhari 645, Muslim 650)."
  }'
```

Bulk import for Qur'an or hadith is also available from the admin panel or via API:

```bash
curl -X POST http://localhost:3001/corpus/import \
  -H "x-demo-admin-key: your-admin-key" \
  -F "type=QURAN" \
  -F "title=Quran" \
  -F "license=approved" \
  -F "language=id" \
  -F "files=@/absolute/path/to/1.json" \
  -F "files=@/absolute/path/to/2.json"
```

Supported import formats:
- single JSON file containing an array of records
- single CSV file
- multiple JSON or CSV files in one import
- per-surah Qur'an JSON files like `quran-json/surah/1.json ... 114.json`

Required fields:
- Qur'an: `surah`, `ayah`, `text`
- Hadith: `collection`, `number`, `text`

---

## 6. LLM Integration

Set `REQUESTY_API_KEY` in `backend/.env` to enable AI answer generation. Without it, the worker falls back to corpus-only retrieval.

## 7. Local Dev Summary

Run these in separate terminals:

```bash
# terminal 1
docker compose up -d postgres

# terminal 2
cd backend && bun run start:dev

# terminal 3
cd backend && bun run build && bun run start:worker

# terminal 4
cd admin && bun run dev

# terminal 5
cd mobile && bun run web
```

Local URLs:
- Backend API: `http://localhost:3001`
- Admin: `http://localhost:5174`
- Mobile web: `http://localhost:8081`
