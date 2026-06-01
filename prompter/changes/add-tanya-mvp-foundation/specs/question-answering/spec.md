## ADDED Requirements
### Requirement: Mobile Question Submission
The system SHALL allow registered users to submit Islamic questions in Indonesian from the mobile app.

#### Scenario: User submits a question
- **WHEN** a registered user submits a question from the mobile app
- **THEN** the system stores the question with user, language, topic, status, and timestamp metadata

### Requirement: Answer Tier Labeling
The system SHALL clearly label every answer as sourced-but-unreviewed or ustadz-verified.

#### Scenario: Safe question receives Tier 1 answer
- **WHEN** the system returns a sourced answer that has not been approved by an ustadz
- **THEN** the answer is labelled as from Qur'an and Sunnah and not yet reviewed by an ustadz

#### Scenario: Verified answer is displayed
- **WHEN** an answer has been explicitly approved by an ustadz
- **THEN** the answer displays the verified badge and the verifying ustadz identity

### Requirement: Verified Answer Reuse
The system SHALL search the Verified Answer Bank before drafting a new sourced answer for safe topics.

#### Scenario: Matching verified answer exists
- **WHEN** a submitted safe question semantically matches a verified answer
- **THEN** the system returns the verified answer instead of creating a new Tier 1 answer

### Requirement: User Answer Library
The system SHALL provide users with question history and saved answers.

#### Scenario: User saves an answer
- **WHEN** a user saves an answer
- **THEN** the answer appears in the user's saved answer library
