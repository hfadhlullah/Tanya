# Change: Add MVP Corpus Import

## Why
The MVP already stores corpus sources, chunks, and pgvector embeddings, but admins still have to add chunks manually. Tanya needs a reliable import flow for Qur'an and hadith so approved source material becomes searchable, citable, and usable by AI answers without hand-entering each record.

## What Changes
- Add an admin corpus import workflow for structured Qur'an and hadith datasets.
- Require import files to use approved structured formats instead of PDF-first ingestion.
- Parse imported records into corpus chunks with citation metadata such as surah/ayah or hadith collection/number/grade.
- Automatically enqueue embeddings for imported chunks so retrieval uses pgvector after import completes.
- Add import status and summary reporting so admins can confirm what was ingested and what failed.

## Impact
- Affected specs: corpus-retrieval, platform-architecture
- Affected code: backend corpus APIs/services, background jobs, admin corpus UI, import validation/parsing, database schema for import tracking if needed
- Proposal only: no implementation starts until this change is approved.
