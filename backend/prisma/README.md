# Prisma And pgvector

Embeddings use `Unsupported("vector(1536)")` because Prisma does not expose typed pgvector operations.

Use Prisma model APIs for relational records, but insert/update/search vector values through centralized raw SQL helpers when the RAG implementation is added. Do not scatter `$queryRaw` or `$executeRaw` calls across feature modules.

Run migrations as an explicit deploy step:

```bash
docker compose --env-file .env.staging.example --profile migrate run --rm migrate
```
