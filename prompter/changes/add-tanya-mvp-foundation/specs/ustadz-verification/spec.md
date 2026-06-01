## ADDED Requirements
### Requirement: Ustadz Onboarding
The system SHALL allow prospective ustadz to submit credentials, public profile links, specialties, madhhab metadata, and gated-topic preferences.

#### Scenario: Ustadz submits onboarding
- **WHEN** a prospective ustadz completes onboarding
- **THEN** the account enters a pending state and the dashboard remains locked until admin approval

### Requirement: Admin Ustadz Approval
Admins SHALL approve or reject ustadz applications before the ustadz can verify answers.

#### Scenario: Admin approves ustadz
- **WHEN** an admin approves a pending ustadz
- **THEN** the ustadz can access the verification dashboard

### Requirement: Ustadz Verification Queue
The system SHALL provide approved ustadz with a review queue for routed sensitive questions and Tier 1 answers awaiting upgrade.

#### Scenario: Ustadz approves answer draft
- **WHEN** an approved ustadz approves an answer draft
- **THEN** the answer becomes verified and is stored in the Verified Answer Bank

### Requirement: Fast Review Workflow
The verification workflow SHALL support approve and edit actions optimized for under 60 seconds per answer.

#### Scenario: Ustadz edits before approval
- **WHEN** an ustadz edits an answer draft and approves it
- **THEN** the edited answer is saved as the verified canonical answer
