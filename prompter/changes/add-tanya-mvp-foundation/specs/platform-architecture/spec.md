## ADDED Requirements
### Requirement: Custom MVP Stack
The system SHALL use Expo React Native for the mobile client, NestJS for the backend API, and PostgreSQL with pgvector for relational and vector storage.

#### Scenario: MVP services are scaffolded
- **WHEN** implementation begins
- **THEN** the backend is scaffolded with `npm i -g @nestjs/cli && nest new Tanya` and the mobile app uses the selected Expo React Native workflow

### Requirement: Worker Process
The system SHALL provide a background worker process for ingestion, embeddings, retrieval indexing, notifications, and analytics aggregation.

#### Scenario: Corpus upload requires processing
- **WHEN** approved corpus content is uploaded
- **THEN** the worker processes chunking, embedding, and indexing outside the request lifecycle

### Requirement: Locked UI Reference
The system SHALL use `docs/onboard-ux/` as the locked product-wide UI/UX reference and SHALL preserve the emerald visual direction from those references across MVP mobile screens.

#### Scenario: MVP mobile screen is implemented
- **WHEN** an MVP mobile screen is built in the React Native app
- **THEN** the implementation follows the emerald UI direction and relevant visual patterns represented in `docs/onboard-ux/`

### Requirement: Atomic Component Design
The mobile app SHALL organize reusable UI components using atomic design categories for atoms, molecules, organisms, templates, and screens.

#### Scenario: Shared UI component is added
- **WHEN** a reusable UI component is created for the React Native app
- **THEN** it is placed in the appropriate atomic design category and composed upward rather than duplicated per screen

### Requirement: Dockerized Backend Deployment
The backend stack SHALL run through Docker Compose with separate API, worker, and PostgreSQL/pgvector services.

#### Scenario: Coolify deploys staging
- **WHEN** staging is deployed through Coolify
- **THEN** the API, worker, and database services run with staging-specific environment variables and persistent database storage

### Requirement: Separate Environments
The system SHALL maintain separate staging and production configuration, secrets, storage, and database state.

#### Scenario: Production is deployed
- **WHEN** production is deployed
- **THEN** it uses production-specific secrets, API URL, database, storage, and mobile build configuration
