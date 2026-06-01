## ADDED Requirements
### Requirement: Sensitive Topic Gate
The system MUST classify question sensitivity before retrieval, drafting, or answer generation.

#### Scenario: Sensitive question is submitted
- **WHEN** a question is classified as sensitive
- **THEN** the system routes it to human ustadz review and returns no AI-generated answer

### Requirement: Configurable Sensitive Rules
The system SHALL allow admins to manage global sensitive-topic rules and ustadz-specific gated topics.

#### Scenario: Admin updates sensitive rules
- **WHEN** an admin adds or modifies a sensitive-topic rule
- **THEN** future questions are evaluated against the updated rule set

### Requirement: Attribution Integrity
The system MUST NOT attach an ustadz name, profile, or verified badge to an answer unless that ustadz explicitly approved it.

#### Scenario: AI draft exists without approval
- **WHEN** an AI draft or sourced answer has not been approved by an ustadz
- **THEN** the system does not display any ustadz attribution for that answer

### Requirement: Safety Audit Trail
The system SHALL record audit events for sensitive classification, admin rule changes, and ustadz verification actions.

#### Scenario: Ustadz verifies an answer
- **WHEN** an ustadz approves or edits an answer
- **THEN** the system records the actor, action, answer, timestamp, and resulting status
