ALTER TABLE "Question" ADD COLUMN "sessionId" TEXT;
CREATE INDEX "Question_sessionId_idx" ON "Question"("sessionId");
