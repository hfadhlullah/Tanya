-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'GRAPH_EXTRACTION';

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "embedding" vector(1536),
    "communityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityMention" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "corpusChunkId" TEXT NOT NULL,

    CONSTRAINT "EntityMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "description" TEXT,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entity_type_idx" ON "Entity"("type");

-- CreateIndex
CREATE INDEX "Entity_communityId_idx" ON "Entity"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "Entity_name_type_key" ON "Entity"("name", "type");

-- CreateIndex
CREATE INDEX "EntityMention_corpusChunkId_idx" ON "EntityMention"("corpusChunkId");

-- CreateIndex
CREATE INDEX "EntityMention_entityId_idx" ON "EntityMention"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityMention_entityId_corpusChunkId_key" ON "EntityMention"("entityId", "corpusChunkId");

-- CreateIndex
CREATE INDEX "Relationship_sourceId_idx" ON "Relationship"("sourceId");

-- CreateIndex
CREATE INDEX "Relationship_targetId_idx" ON "Relationship"("targetId");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityMention" ADD CONSTRAINT "EntityMention_corpusChunkId_fkey" FOREIGN KEY ("corpusChunkId") REFERENCES "CorpusChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
