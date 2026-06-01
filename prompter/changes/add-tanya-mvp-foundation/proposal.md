# Change: Add Tanya MVP Foundation

## Why
Tanya needs a buildable MVP foundation that protects trust: users can ask Islamic questions, safe topics receive sourced answers, sensitive topics route to ustadz, and verified answers compound into a reusable answer bank.

## What Changes
- Add mobile-first question submission and answer viewing requirements.
- Add the sensitive-topic gate that runs before any AI answer.
- Add sourced Tier 1 answers and ustadz-verified Tier 2 answers.
- Add ustadz onboarding, approval, and verification workflow.
- Add corpus, pgvector retrieval, Verified Answer Bank, and audit/analytics requirements.
- Lock `docs/onboard-ux/` as the product-wide UI/UX reference and preserve the emerald visual direction.
- Require React Native UI components to follow atomic design organization.
- Add deployment architecture for Expo React Native, NestJS, PostgreSQL + pgvector, Docker Compose, and Coolify.

## Impact
- Affected specs: question-answering, trust-safety, ustadz-verification, corpus-retrieval, platform-architecture
- Affected code: new Expo mobile app, atomic UI component system, NestJS API, worker process, PostgreSQL/pgvector schema, admin/ustadz dashboard, Docker/Coolify deployment config
- Proposal only: no implementation starts until this change is approved.
