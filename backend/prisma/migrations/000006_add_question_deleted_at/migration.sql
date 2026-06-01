ALTER TABLE "Question" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Question_userId_deletedAt_idx" ON "Question"("userId", "deletedAt");
