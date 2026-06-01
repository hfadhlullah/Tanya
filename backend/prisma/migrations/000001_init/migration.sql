CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE "UserRole" AS ENUM ('USER', 'USTADZ', 'ADMIN');
CREATE TYPE "UstadzStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "QuestionStatus" AS ENUM ('RECEIVED', 'ROUTED_TO_USTADZ', 'ANSWERED_SOURCE', 'ANSWERED_VERIFIED');
CREATE TYPE "AnswerStatus" AS ENUM ('AI_PENDING', 'VERIFIED');
CREATE TYPE "SourceType" AS ENUM ('QURAN', 'HADITH', 'USTADZ_CONTENT');
CREATE TYPE "SensitiveRuleScope" AS ENUM ('GLOBAL', 'USTADZ');
CREATE TYPE "AuditAction" AS ENUM ('USTADZ_APPROVED', 'USTADZ_REJECTED', 'SENSITIVE_RULE_CHANGED', 'QUESTION_CLASSIFIED', 'ANSWER_APPROVED', 'ANSWER_EDITED');
CREATE TYPE "JobType" AS ENUM ('CORPUS_EMBEDDING', 'ANALYTICS_AGGREGATION');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UstadzProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "bio" TEXT,
    "credentials" TEXT,
    "publicProfile" TEXT,
    "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "madhhab" TEXT,
    "status" "UstadzStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UstadzProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CredentialFile" (
    "id" TEXT NOT NULL,
    "ustadzId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CredentialFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'id',
    "topic" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "preferredUstadzId" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "AnswerStatus" NOT NULL DEFAULT 'AI_PENDING',
    "verifyingUstadzId" TEXT,
    "topic" TEXT,
    "madhhab" TEXT,
    "language" TEXT NOT NULL DEFAULT 'id',
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "excerpt" TEXT,
    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "reference" TEXT,
    "license" TEXT,
    "language" TEXT NOT NULL DEFAULT 'id',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CorpusChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "topic" TEXT,
    "metadata" JSONB,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CorpusChunk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SensitiveRule" (
    "id" TEXT NOT NULL,
    "scope" "SensitiveRuleScope" NOT NULL DEFAULT 'GLOBAL',
    "ustadzId" TEXT,
    "topic" TEXT NOT NULL,
    "pattern" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SensitiveRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "corpusChunkId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "payload" JSONB,
    "error" TEXT,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "UstadzProfile_userId_key" ON "UstadzProfile"("userId");
CREATE INDEX "Question_userId_createdAt_idx" ON "Question"("userId", "createdAt");
CREATE INDEX "Question_isSensitive_status_idx" ON "Question"("isSensitive", "status");
CREATE INDEX "Question_preferredUstadzId_idx" ON "Question"("preferredUstadzId");
CREATE INDEX "Answer_status_createdAt_idx" ON "Answer"("status", "createdAt");
CREATE INDEX "Answer_verifyingUstadzId_idx" ON "Answer"("verifyingUstadzId");
CREATE INDEX "CorpusChunk_sourceId_idx" ON "CorpusChunk"("sourceId");
CREATE INDEX "CorpusChunk_topic_idx" ON "CorpusChunk"("topic");
CREATE INDEX "SensitiveRule_scope_isActive_idx" ON "SensitiveRule"("scope", "isActive");
CREATE INDEX "SensitiveRule_ustadzId_idx" ON "SensitiveRule"("ustadzId");
CREATE UNIQUE INDEX "SavedAnswer_userId_answerId_key" ON "SavedAnswer"("userId", "answerId");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");
CREATE INDEX "BackgroundJob_status_runAfter_createdAt_idx" ON "BackgroundJob"("status", "runAfter", "createdAt");
CREATE INDEX "BackgroundJob_status_leaseExpiresAt_idx" ON "BackgroundJob"("status", "leaseExpiresAt");
CREATE INDEX "BackgroundJob_type_status_idx" ON "BackgroundJob"("type", "status");
CREATE INDEX "BackgroundJob_corpusChunkId_idx" ON "BackgroundJob"("corpusChunkId");
CREATE INDEX "Answer_embedding_idx" ON "Answer" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);
CREATE INDEX "CorpusChunk_embedding_idx" ON "CorpusChunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

ALTER TABLE "UstadzProfile" ADD CONSTRAINT "UstadzProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CredentialFile" ADD CONSTRAINT "CredentialFile_ustadzId_fkey" FOREIGN KEY ("ustadzId") REFERENCES "UstadzProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_preferredUstadzId_fkey" FOREIGN KEY ("preferredUstadzId") REFERENCES "UstadzProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_verifyingUstadzId_fkey" FOREIGN KEY ("verifyingUstadzId") REFERENCES "UstadzProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CorpusChunk" ADD CONSTRAINT "CorpusChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SensitiveRule" ADD CONSTRAINT "SensitiveRule_ustadzId_fkey" FOREIGN KEY ("ustadzId") REFERENCES "UstadzProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedAnswer" ADD CONSTRAINT "SavedAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedAnswer" ADD CONSTRAINT "SavedAnswer_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_corpusChunkId_fkey" FOREIGN KEY ("corpusChunkId") REFERENCES "CorpusChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
