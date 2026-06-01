## 1. Backend Import Foundation
- [ ] 1.1 Define the approved MVP import schemas for Qur'an and hadith records.
- [ ] 1.2 Add a backend admin import endpoint or action that accepts structured corpus files.
- [ ] 1.3 Validate file type, required fields, and source type before ingesting records.

## 2. Ingestion And Vectorization
- [ ] 2.1 Parse Qur'an imports into one chunk per ayah with surah and ayah metadata.
- [ ] 2.2 Parse hadith imports into one chunk per hadith with collection, number, and grade metadata.
- [ ] 2.3 Create source records and chunk records in a way that avoids duplicate accidental imports.
- [ ] 2.4 Enqueue embedding jobs for all imported chunks and expose import progress or summary status.

## 3. Admin Experience
- [ ] 3.1 Add admin UI controls for importing Qur'an and hadith corpora.
- [ ] 3.2 Show imported source metadata, chunk counts, and import result summaries.

## 4. Validation
- [ ] 4.1 Add tests for import validation failures and happy-path imports.
- [ ] 4.2 Add tests that imported chunks receive embedding jobs.
- [ ] 4.3 Add tests that answer retrieval can use imported chunks as citations.

## Post-Implementation
- [ ] Update AGENTS.md in the project root for corpus import workflows and operational notes.
