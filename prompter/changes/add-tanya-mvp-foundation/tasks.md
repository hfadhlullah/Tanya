## 1. Foundation
- [x] 1.1 Scaffold the NestJS backend with `npm i -g @nestjs/cli && nest new Tanya`.
- [x] 1.2 Scaffold the Expo React Native app using the selected Expo workflow.
- [x] 1.3 Reference `docs/onboard-ux/` and lock the emerald UI direction before implementing MVP mobile screens.
- [x] 1.4 Set up the React Native component structure using atomic design categories such as atoms, molecules, organisms, templates, and screens.
- [x] 1.5 Add Docker Compose services for API, worker, and PostgreSQL with pgvector.
- [x] 1.6 Configure separate staging and production environment variables for Coolify.

## 2. Data Model
- [x] 2.1 Create schemas for users, ustadz profiles, credentials, questions, answers, citations, corpus chunks, sensitive rules, saved answers, audit logs, and analytics events.
- [x] 2.2 Add pgvector extension and embedding indexes for corpus chunks and verified answers.
- [x] 2.3 Seed initial roles and baseline sensitive-topic rules.

## 3. Question Answering
- [x] 3.1 Implement mobile question submission and question history.
- [x] 3.2 Run sensitive-topic classification before retrieval or answer drafting.
- [x] 3.3 Route sensitive questions to ustadz review without returning an AI answer.
- [x] 3.4 Return source-bound Tier 1 answers for safe topics with unreviewed labeling.
- [x] 3.5 Reuse matching verified answers from the Verified Answer Bank when available.

## 4. Ustadz And Admin Workflows
- [x] 4.1 Implement ustadz onboarding with credentials, specialties, madhhab, and gated topics.
- [x] 4.2 Lock pending ustadz accounts until admin approval.
- [x] 4.3 Implement the ustadz review queue with approve/edit actions.
- [x] 4.4 Ensure verified badges and ustadz names appear only after explicit approval.
- [x] 4.5 Implement admin management for ustadz approval, corpus records, sensitive rules, and audits.

## 5. Corpus And Jobs
- [x] 5.1 Implement corpus ingestion for approved Qur'an, hadith, and founding ustadz content.
- [x] 5.2 Add the background job foundation and placeholder corpus embedding processing; real chunking, retrieval indexing, and analytics aggregation handlers remain follow-up work.
- [ ] 5.3 Add file storage handling for credentials, photos, source files, and corpus uploads.

## 6. Validation
- [ ] 6.1 Add tests for sensitive-topic routing and no-AI behavior.
- [ ] 6.2 Add tests for answer attribution, verified badge rules, and citation requirements.
- [ ] 6.3 Add tests for ustadz pending/approved access behavior.
- [ ] 6.4 Add tests for answer bank matching and source retrieval.
- [ ] 6.5 Validate staging deployment through Coolify before production rollout.

## Post-Implementation
- [x] Update AGENTS.md in the project root for new architecture, commands, and operational constraints.
