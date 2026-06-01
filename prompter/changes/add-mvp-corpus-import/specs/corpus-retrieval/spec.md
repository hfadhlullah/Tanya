## ADDED Requirements
### Requirement: Structured Corpus Import
The system SHALL let admins import approved Qur'an and hadith corpora from structured files that can be validated before ingestion.

#### Scenario: Admin imports Qur'an corpus
- **WHEN** an admin uploads a valid structured Qur'an import file
- **THEN** the system validates the records and ingests them as source-bound corpus chunks

#### Scenario: Admin imports hadith corpus
- **WHEN** an admin uploads a valid structured hadith import file
- **THEN** the system validates the records and ingests them as source-bound corpus chunks

#### Scenario: Import file is invalid
- **WHEN** an admin uploads a malformed or incomplete import file
- **THEN** the system rejects the import and returns actionable validation errors

### Requirement: Corpus Citation Metadata
The system SHALL preserve citation metadata for imported corpus chunks so answer citations can point to exact Qur'an or hadith references.

#### Scenario: Qur'an chunk is imported
- **WHEN** a Qur'an ayah is ingested
- **THEN** the chunk stores metadata needed to cite its surah and ayah reference

#### Scenario: Hadith chunk is imported
- **WHEN** a hadith record is ingested
- **THEN** the chunk stores metadata needed to cite its collection, number, and grading reference

### Requirement: Imported Corpus Vectorization
The system SHALL enqueue and store pgvector embeddings for imported corpus chunks after ingestion.

#### Scenario: Import finishes successfully
- **WHEN** corpus chunks are created from an approved import
- **THEN** the system enqueues embedding work for those chunks and makes them available for semantic retrieval after processing completes
