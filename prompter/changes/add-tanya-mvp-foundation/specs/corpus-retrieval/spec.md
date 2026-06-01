## ADDED Requirements
### Requirement: Approved Corpus Management
The system SHALL ingest only approved launch sources: Qur'an translation, authentic hadith with grading metadata, and founding ustadz content.

#### Scenario: Admin adds corpus source
- **WHEN** an admin adds a corpus source
- **THEN** the system stores source metadata, licensing status, and content type before ingestion

### Requirement: Corpus Chunk Embeddings
The system SHALL chunk approved corpus content and store embeddings in PostgreSQL with pgvector.

#### Scenario: Corpus content is ingested
- **WHEN** approved corpus content is processed
- **THEN** searchable chunks with embeddings and citation metadata are stored

### Requirement: Citation-Bound Answers
Tier 1 and Tier 2 answers SHALL include citations to their supporting sources.

#### Scenario: Answer is displayed
- **WHEN** an answer is shown to a user
- **THEN** the answer includes source citations such as ayah, hadith, or founding ustadz content references

### Requirement: Verified Answer Bank Indexing
The system SHALL index verified answers for semantic retrieval and reuse.

#### Scenario: Answer becomes verified
- **WHEN** an answer is approved by an ustadz
- **THEN** the system stores it as a canonical verified answer with searchable embedding metadata
