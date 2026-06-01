## 1. Backend Import Foundation
- [x] 1.1 Define the approved MVP import schemas for Qur'an and hadith records.
- [x] 1.2 Add a backend admin import endpoint or action that accepts structured corpus files.
- [x] 1.3 Validate file type, required fields, and source type before ingesting records.

## 2. Ingestion And Vectorization
- [x] 2.1 Parse Qur'an imports into one chunk per ayah with surah and ayah metadata.
- [x] 2.2 Parse hadith imports into one chunk per hadith with collection, number, and grade metadata.
- [x] 2.3 Create source records and chunk records in a way that avoids duplicate accidental imports.
- [x] 2.4 Enqueue embedding jobs for all imported chunks and expose import progress or summary status.

## 3. Admin Experience
- [x] 3.1 Add admin UI controls for importing Qur'an and hadith corpora.
- [x] 3.2 Show imported source metadata, chunk counts, and import result summaries.

## 4. Validation
- [x] 4.1 Add tests for import validation failures and happy-path imports.
- [x] 4.2 Add tests that imported chunks receive embedding jobs.
- [x] 4.3 Add tests that answer retrieval can use imported chunks as citations.

## Post-Implementation
- [x] Update AGENTS.md in the project root for corpus import workflows and operational notes.
