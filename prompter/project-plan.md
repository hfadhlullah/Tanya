# Tanya Project Plan

## Project

Tanya — an Indonesian-first trusted answer engine for Muslims who feel lost, combining AI-fast sourced answers with ustadz verification and clear citations.

## In-Scope MVP Features

- Mobile-first ask-anything flow in Indonesian using React Native/Expo.
- Sensitive-topic gate before any AI answer; sensitive questions route to human ustadz.
- Tier 1 sourced answers for safe topics using Qur'an, authentic hadith, and founding ustadz corpus, clearly labelled as not yet reviewed.
- Tier 2 verified answers approved by an ustadz, saved into a Verified Answer Bank with name, badge, citations, topic, madhhab, and language tags.
- User onboarding, question history, saved answers, answer detail screen, and follow-up prompts.
- Ustadz onboarding with credential submission, specialties, madhhab, sensitive-topic preferences, and locked pending state.
- Ustadz verification dashboard for approve/edit flows targeting under 60 seconds per answer.
- Admin tools for approving ustadz, managing corpus, sensitive-topic rules, answer review, and trust/audit oversight.
- RAG pipeline using PostgreSQL + pgvector for corpus chunks and semantic answer retrieval.
- Product analytics for Verified Answer Bank coverage, time-to-verified-answer, ustadz throughput, retention, and sensitive-topic leakage.

## Out-of-Scope Deferred

- Paid private ustadz marketplace.
- Donations/waqf monetization.
- Madhhab preference filter UI.
- Global English version.
- Broad fatwa database/fiqh-book corpus beyond approved launch sources.
- Advanced reporting dashboards.
- Public SEO web answer library, unless pulled forward as acquisition-critical.

## User Roles

- User: asks questions, views sourced/verified answers, saves answers, receives status updates.
- Ustadz: submits credentials, sets specialties/gates, reviews and verifies answers after admin approval.
- Admin: approves ustadz, manages corpus/sensitive rules, reviews safety/audit data, oversees answer quality.

## Core Data Entities

- Users and profiles.
- Ustadz profiles, credentials, specialties, madhhab tags, approval status.
- Questions with topic, language, sensitivity classification, selected/preferred ustadz.
- Answers with status `ai_pending` or `verified`, citations, verifying ustadz, topic, madhhab, language, sensitivity flag.
- Sources: Qur'an, hadith, and founding ustadz content references.
- Corpus chunks with embeddings stored via pgvector.
- Verified Answer Bank records for semantic reuse.
- Sensitive-topic rules, including global and ustadz-specific gates.
- Saved answers/history.
- Audit logs for admin and ustadz verification actions.
- Analytics events and metrics.

## Selected Integrations

- Vector search: PostgreSQL with pgvector, self-hosted.
- File storage: self-hosted or S3-compatible storage for credentials, photos, source files, and corpus uploads.
- Background jobs: NestJS-compatible worker process for embeddings, ingestion, classification, transcription hooks, and analytics jobs.
- Real-time: limited status updates for answer verification and dashboard refresh, implemented through the NestJS layer if needed.
- Caching: stack-native first; add Redis only if job volume or cache needs justify it.
- Analytics: self-host-friendly product/event analytics, focused on trust and funnel metrics.
- Payments: deferred.
- SMS/email: deferred unless verification notifications become required in MVP.

## Non-Functional Requirements

- Security: role-based access, locked pending ustadz state, sensitive-topic no-AI rule, audit logs, citation integrity, no ustadz attribution unless verified.
- Performance: design for 1k-10k MVP users; prioritize indexed question/answer lookup and efficient vector retrieval.
- SEO: important long-term for public verified answers, but mobile-first launch defers public SEO web pages unless acquisition requires them immediately.
- Safety: sensitive-topic leakage should be treated as a guardrail metric near zero.
- Localization: Indonesian-first language, local Islamic vocabulary, clean adab-preserving answer tone.

## Tech Stack

- Custom stack: React Native + PostgreSQL + pgvector.
- Mobile client: Expo React Native, mobile-first.
- Backend/API: NestJS TypeScript API.
- Database: PostgreSQL with pgvector extension.
- RAG: embeddings stored in pgvector; retrieval over approved source corpus and Verified Answer Bank.
- Admin/Ustadz dashboards: backend-served or lightweight web dashboard to be defined during implementation planning.

## Docker + Web Server

- Use Docker and Docker Compose for backend services.
- Services: NestJS API, worker process, PostgreSQL with pgvector, and optional object-storage/analytics services depending on implementation.
- Deploy through Coolify on VPS for staging and production.
- Coolify manages routing/proxying; no separate Caddy install step is included because the VPS uses Coolify's proxy layer.

## Deployment Target + Environments

- Target: VPS managed by Coolify.
- Environments: staging and production.
- Each environment should have separate database, storage, secrets, API URL, and mobile build configuration.

## Recommended Next Steps

1. Scaffold the backend with the exact approved command: `npm i -g @nestjs/cli && nest new Tanya`.
2. Scaffold the mobile app with the React Native/Expo command you choose; this is outside the house setup-command table, so no invented command is prescribed here.
3. Create Docker Compose services for NestJS API, NestJS worker, and PostgreSQL with pgvector.
4. Configure Coolify staging and production apps with separate env vars, secrets, database volumes, and domains.
5. Define the first Prompter proposal for the MVP architecture and core answer workflow before implementation.
6. Finalize the sensitive-topic list with the founding ustadz.
7. Confirm licensing for Qur'an translation, hadith datasets, and founding ustadz content.
8. Pre-seed 200-500 common questions into the Verified Answer Bank or review queue.
