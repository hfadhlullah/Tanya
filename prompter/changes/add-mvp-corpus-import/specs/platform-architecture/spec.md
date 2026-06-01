## ADDED Requirements
### Requirement: Bulk Corpus Import Pipeline
The platform SHALL provide an asynchronous import pipeline for MVP corpus ingestion so large approved datasets do not depend on manual per-chunk entry.

#### Scenario: Admin starts a corpus import
- **WHEN** an admin submits an approved corpus import file
- **THEN** the platform processes the import through backend ingestion logic and background embedding jobs

#### Scenario: Admin reviews import outcome
- **WHEN** import processing completes or fails
- **THEN** the platform exposes a summary of ingested records, rejected records, and resulting chunk totals
