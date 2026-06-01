-- DropIndex
DROP INDEX "Answer_embedding_idx";

-- DropIndex
DROP INDEX "CorpusChunk_embedding_idx";

-- DropIndex
DROP INDEX "Question_sessionId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredUstadzIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
