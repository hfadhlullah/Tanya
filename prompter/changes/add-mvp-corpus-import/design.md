## Context
Tanya's trust model depends on approved religious sources and precise citations. For MVP, the existing manual source and chunk endpoints are too operationally expensive for Qur'an and hadith. The import flow should prefer structured datasets that map cleanly to citations and chunk boundaries, then reuse the existing embedding pipeline.

## Goals / Non-Goals
- Goals: let admins import Qur'an and hadith corpora in bulk.
- Goals: preserve source licensing and structured citation metadata.
- Goals: automatically create chunk embeddings after import.
- Goals: make import failures visible without partially hiding bad records.
- Non-Goals: OCR, PDF parsing, EPUB parsing, or fuzzy extraction from unstructured books.
- Non-Goals: public self-serve corpus uploads by end users or ustadz.

## Decisions
- Decision: Support structured JSON and CSV as the MVP import formats.
- Rationale: They are simple to validate, easy to source from licensed datasets, and avoid fragile parsing logic.
- Decision: Import Qur'an one ayah per chunk.
- Rationale: Ayah-level chunks produce precise citations and match common retrieval expectations.
- Decision: Import hadith one hadith per chunk.
- Rationale: Hadith records already map naturally to citation labels like collection, number, and grade.
- Decision: Store citation-specific fields in chunk metadata instead of adding many new top-level chunk columns.
- Rationale: MVP needs flexibility for different source shapes while keeping the schema small.
- Decision: Reuse the existing background embedding job for imported chunks.
- Rationale: This keeps import and vectorization loosely coupled and consistent with current chunk creation behavior.

## Risks / Trade-offs
- Risk: Low-quality or inconsistent datasets create weak citations. Mitigation: require import schema validation and admin-visible error summaries.
- Risk: Large imports create many embedding jobs and delay readiness. Mitigation: track import status separately from file upload and surface pending/completed counts.
- Risk: Metadata-only flexibility can reduce query strictness later. Mitigation: keep the MVP schema small now and promote fields later only if retrieval or reporting requires it.

## Migration Plan
This change should be additive. Existing sources and chunks remain valid. New import data should create standard `Source` and `CorpusChunk` rows and use the current embedding worker path.

## Open Questions
- Which licensed Qur'an translation dataset will Tanya ship with first?
- Which hadith collections are approved for MVP launch?
- Should the first admin import UX be file upload only, or should it also support a server-local seeded import command for initial setup?
