import { PrismaClient } from '@prisma/client';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ExtractedEntity = { name: string; type: string; description: string };
type ExtractedRelationship = {
  source: string;
  target: string;
  type: string;
  description: string;
};
type ExtractionResult = {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
};

const VALID_ENTITY_TYPES = new Set([
  'CONCEPT',
  'PERSON',
  'RULING',
  'VERSE',
  'HADITH',
]);
const VALID_RELATIONSHIP_TYPES = new Set([
  'SUPPORTS',
  'ELABORATES',
  'CONTRADICTS',
  'REFERENCES',
  'DERIVED_FROM',
]);

const EXTRACTION_SYSTEM_PROMPT = `Extract entities and relationships from the following Islamic text. Return ONLY valid JSON with no additional text or markdown.

Entity types (use exactly one): CONCEPT, PERSON, RULING, VERSE, HADITH

Relationship types (use exactly one): SUPPORTS, ELABORATES, CONTRADICTS, REFERENCES, DERIVED_FROM

JSON format:
{
  "entities": [
    {"name": "entity name", "type": "ENTITY_TYPE", "description": "brief one-sentence description"}
  ],
  "relationships": [
    {"source": "entity name", "target": "entity name", "type": "RELATIONSHIP_TYPE", "description": "brief description"}
  ]
}

Rules:
- Extract 3-8 entities maximum
- Only create relationships between entities you extracted
- Keep entity names concise and normalized (e.g., "Zakat" not "the concept of zakat")
- Return empty arrays if nothing meaningful to extract
- Return ONLY the JSON object, no other text`;

export class GraphExtractionService {
  async extractFromChunk(
    chunkId: string,
    content: string,
    prisma: PrismaClient,
    completeFn: (messages: ChatMessage[]) => Promise<string>,
    embedFn: (text: string) => Promise<number[]>,
  ): Promise<void> {
    const raw = await completeFn([
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: content.slice(0, 2000) },
    ]);

    const result = this.parseExtraction(raw);
    if (result.entities.length === 0) return;

    await this.persistEntities(chunkId, result, prisma, embedFn);
  }

  private parseExtraction(raw: string): ExtractionResult {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { entities: [], relationships: [] };

      const parsed = JSON.parse(jsonMatch[0]) as Partial<ExtractionResult>;
      const entities = (parsed.entities ?? [])
        .filter(
          (e) =>
            e.name?.trim() &&
            e.type &&
            VALID_ENTITY_TYPES.has(e.type.toUpperCase()),
        )
        .map((e) => ({
          name: e.name.trim(),
          type: e.type.toUpperCase(),
          description: e.description?.trim() ?? '',
        }));

      const entityNames = new Set(entities.map((e) => e.name));
      const relationships = (parsed.relationships ?? [])
        .filter(
          (r) =>
            r.source &&
            r.target &&
            r.type &&
            entityNames.has(r.source) &&
            entityNames.has(r.target) &&
            VALID_RELATIONSHIP_TYPES.has(r.type.toUpperCase()),
        )
        .map((r) => ({
          source: r.source,
          target: r.target,
          type: r.type.toUpperCase(),
          description: r.description?.trim() ?? '',
        }));

      return { entities, relationships };
    } catch {
      return { entities: [], relationships: [] };
    }
  }

  private async persistEntities(
    chunkId: string,
    result: ExtractionResult,
    prisma: PrismaClient,
    embedFn: (text: string) => Promise<number[]>,
  ): Promise<void> {
    const entityIds = new Map<string, string>();

    for (const entity of result.entities) {
      const key = `${entity.name}::${entity.type}`;
      try {
        const upserted = await prisma.entity.upsert({
          where: { name_type: { name: entity.name, type: entity.type } },
          create: {
            name: entity.name,
            type: entity.type,
            description: entity.description || null,
          },
          update: {
            description: entity.description || undefined,
          },
          select: { id: true },
        });
        entityIds.set(key, upserted.id);

        if (entity.description) {
          try {
            const embedding = await embedFn(entity.description);
            const vectorLiteral = `[${embedding.join(',')}]`;
            await prisma.$executeRaw`
              UPDATE "Entity"
              SET embedding = ${vectorLiteral}::vector
              WHERE id = ${upserted.id}
            `;
          } catch {
            // Non-fatal: embedding will be computed later
          }
        }

        await prisma.entityMention.upsert({
          where: {
            entityId_corpusChunkId: {
              entityId: upserted.id,
              corpusChunkId: chunkId,
            },
          },
          create: {
            entityId: upserted.id,
            corpusChunkId: chunkId,
          },
          update: {},
        });
      } catch {
        // Entity upsert failed, skip
      }
    }

    const entityIdByName = new Map<string, string>();
    for (const [key, id] of entityIds) {
      const name = key.split('::')[0];
      entityIdByName.set(name, id);
    }

    for (const rel of result.relationships) {
      const sourceId = entityIdByName.get(rel.source);
      const targetId = entityIdByName.get(rel.target);

      if (!sourceId || !targetId) continue;

      try {
        await prisma.relationship.create({
          data: {
            sourceId,
            targetId,
            type: rel.type,
            description: rel.description || null,
          },
        });
      } catch {
        // Duplicate relationships silently skipped
      }
    }
  }
}
