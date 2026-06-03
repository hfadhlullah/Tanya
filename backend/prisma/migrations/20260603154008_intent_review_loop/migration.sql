-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('APPROVE', 'EDIT', 'REJECT', 'NEEDS_REVISION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AnswerStatus" ADD VALUE 'USTADZ_EDITED';
ALTER TYPE "AnswerStatus" ADD VALUE 'USTADZ_REJECTED';
ALTER TYPE "AnswerStatus" ADD VALUE 'NEEDS_REVISION';

-- AlterEnum
ALTER TYPE "SourceType" ADD VALUE 'VERIFIED_ANSWER';

-- CreateTable
CREATE TABLE "AnswerReview" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "ustadzId" TEXT NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "aiBody" TEXT NOT NULL,
    "editedBody" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnswerReview_answerId_idx" ON "AnswerReview"("answerId");

-- CreateIndex
CREATE INDEX "AnswerReview_ustadzId_idx" ON "AnswerReview"("ustadzId");

-- AddForeignKey
ALTER TABLE "AnswerReview" ADD CONSTRAINT "AnswerReview_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerReview" ADD CONSTRAINT "AnswerReview_ustadzId_fkey" FOREIGN KEY ("ustadzId") REFERENCES "UstadzProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
