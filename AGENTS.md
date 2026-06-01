<!-- PROMPTER:START -->
# Prompter Instructions

These instructions are for AI assistants working in this project.

Always open `@/prompter/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/prompter/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines
- Show Remaining Tasks

<!-- PROMPTER:END -->

## Tanya Architecture Notes

- Active approved proposal: `prompter/changes/add-tanya-mvp-foundation/`.
- Backend: NestJS in `backend/`.
- Mobile: Expo React Native in `mobile/`.
- Package manager/runtime: prefer Bun (`bun install`, `bun run ...`, `bunx ...`) for app workspaces.
- Database: PostgreSQL with pgvector via `pgvector/pgvector:pg16`.
- Deployment target: Coolify on VPS with separate staging and production environments.
- UI/UX reference: `docs/onboard-ux/` is the locked product-wide reference; preserve the emerald visual direction across MVP screens.
- Mobile components use atomic design: `atoms`, `molecules`, `organisms`, `templates`, and `screens` under `mobile/src/`.
- Corpus MVP import is available at `POST /corpus/import` for admin use with multipart `file` plus `type`, `title`, `license`, optional `reference`, and optional `language`.
- Supported corpus import formats are structured JSON or CSV only. Qur'an records must include `surah`, `ayah`, and `text`; hadith records must include `collection`, `number`, and `text`.
