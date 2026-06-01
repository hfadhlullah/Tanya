# Tanya

Islamic Q&A platform. NestJS backend + Postgres (pgvector) + React Native/Expo mobile + React admin panel.

## Prerequisites

- Docker + Docker Compose
- Node.js 20+ and npm
- (Optional) Bun for seeding

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
npx prisma migrate deploy
```

Start backend:

```bash
npm run start:dev
```

API runs at `http://localhost:3000`.

---

## 3. Mobile (Expo)

```bash
cd mobile
npm install
```

Create `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Start Expo:

```bash
npx expo start --web
```

- Browser: `http://localhost:8081`
- Other devices on same WiFi: use your machine's LAN IP instead of `localhost`

### Ustadz flow

A user with role `USTADZ` in the DB gets routed to ustadz screens automatically on login.

---

## 4. Admin Panel

```bash
cd admin
npm install
```

Create `admin/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Start admin panel:

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

```bash
# Create a source
curl -X POST http://localhost:3000/corpus/sources \
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
curl -X POST http://localhost:3000/corpus/chunks \
  -H "Content-Type: application/json" \
  -H "x-demo-admin-key: your-admin-key" \
  -d '{
    "sourceId": "SOURCE_ID",
    "topic": "sholat berjamaah",
    "content": "Sholat berjamaah lebih utama daripada sholat sendirian dengan dua puluh tujuh derajat (HR. Bukhari 645, Muslim 650)."
  }'
```

---

## 6. LLM Integration

Set `REQUESTY_API_KEY` in `backend/.env` to enable AI answer generation. Without it, the worker falls back to corpus-only retrieval.
