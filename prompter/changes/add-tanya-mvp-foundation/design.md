## Context
Tanya is an Indonesian-first trusted answer engine for Muslims. The core risk is not generic product complexity; it is religious trust and safety. The architecture must make it difficult to accidentally generate unreviewed religious rulings, attach an ustadz name to unverified content, or answer sensitive topics with AI.

## Goals / Non-Goals
- Goals: deliver a mobile-first MVP, enforce sensitive-topic gating, support sourced and verified answer tiers, build a reusable Verified Answer Bank, and provide admin/ustadz workflows.
- Goals: use React Native/Expo, NestJS, PostgreSQL with pgvector, Docker Compose, and Coolify for staging and production.
- Goals: lock `docs/onboard-ux/` as the product-wide UI/UX reference and preserve its emerald visual direction across MVP screens.
- Goals: organize React Native UI components with atomic design so shared primitives and composed sections stay consistent.
- Non-Goals: paid private ustadz guidance, donations, madhhab preference UI, global English launch, broad external fatwa databases, advanced reporting dashboards, and public SEO answer pages.

## Decisions
- Decision: Use NestJS for the backend API and worker modules.
- Rationale: Tanya has roles, audit trails, background work, safety gates, and multiple workflows; NestJS provides structure without leaving the TypeScript ecosystem.
- Decision: Use PostgreSQL with pgvector for the primary database and vector retrieval.
- Rationale: This keeps relational data, audit history, answer bank records, and embeddings in one self-hostable store suitable for Coolify/VPS deployment.
- Decision: Run the sensitive-topic classifier before retrieval or generation.
- Rationale: Sensitive leakage is the main safety failure. The system should refuse AI answering early and route the question to ustadz review.
- Decision: Treat AI as retrieval-and-drafting infrastructure, not a religious authority.
- Rationale: Tier 1 answers must be source-bound and labelled unreviewed; Tier 2 answers require explicit ustadz approval before using a name or verified badge.
- Decision: Defer public SEO answer pages from the mobile-first MVP.
- Rationale: SEO is strategically important, but mobile-first launch should validate the trust workflow first. Public answer pages can be a follow-up capability.
- Decision: Treat `docs/onboard-ux/` as the locked product-wide UI/UX reference.
- Rationale: The emerald visual direction already matches Tanya's calm, trustworthy product tone. Implementation should preserve this direction for onboarding and use it as the reference for other MVP screens instead of redesigning from scratch.
- Decision: Use atomic design for React Native components.
- Rationale: Tanya will have repeated trust blocks, answer cards, source rows, profile summaries, and review actions. Atomic design keeps primitives reusable while allowing screen-specific composition.

## Risks / Trade-offs
- Risk: Weak corpus quality turns the product into generic AI with religious branding. Mitigation: require approved launch sources, citation metadata, and corpus ingestion controls.
- Risk: Sensitive-topic classifier misses harmful questions. Mitigation: maintain configurable sensitive rules, audit classifier outcomes, and track sensitive leakage as a guardrail metric.
- Risk: Ustadz verification becomes too slow. Mitigation: design review queues and approve/edit flows around the under-60-second target.
- Risk: Self-hosted pgvector increases ops responsibility. Mitigation: deploy with Docker Compose in Coolify, separate staging/production databases, and document backups.

## Migration Plan
This is a new MVP foundation, so no data migration is required. Initial implementation should create fresh schemas, seed sensitive-topic rules, and ingest only licensed/approved corpus content.

## Open Questions
- Which embedding provider/model will be used for MVP?
- Which object storage service will be used in Coolify/VPS environments?
- Will the first dashboard be a simple web app, admin-only tool, or generated internal interface?
