/**
 * Build or refresh community clusters for GraphRAG global search.
 *
 * Uses Union-Find connected components over entity relationships,
 * then asks the LLM to summarize each community.
 *
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/build-communities.ts
 */
import { PrismaClient } from '@prisma/client';

const baseUrl =
  process.env.REQUESTY_BASE_URL ?? 'https://router.requesty.ai/v1';
const apiKey = process.env.REQUESTY_API_KEY ?? '';
const chatModel = process.env.REQUESTY_CHAT_MODEL ?? 'openai/gpt-4o-mini';
const embeddingModel =
  process.env.REQUESTY_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
const MIN_COMMUNITY_SIZE = 3;

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

async function complete(
  messages: { role: string; content: string }[],
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: chatModel, messages }),
  });
  if (!res.ok) throw new Error(`LLM failed: ${res.status}`);
  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return json.choices[0].message.content;
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ model: embeddingModel, input: text }),
  });
  if (!res.ok) throw new Error(`Embed failed: ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

// Union-Find
function makeUnionFind(ids: string[]) {
  const parent = new Map<string, string>();
  for (const id of ids) parent.set(id, id);

  function find(x: string): string {
    const p = parent.get(x)!;
    if (p !== x) {
      parent.set(x, find(p));
    }
    return parent.get(x)!;
  }

  function union(a: string, b: string) {
    parent.set(find(a), find(b));
  }

  return { find, union, parent };
}

async function main() {
  const prisma = new PrismaClient();

  console.log('Loading entities and relationships...');
  const [entities, relationships] = await Promise.all([
    prisma.entity.findMany({
      select: { id: true, name: true, type: true, description: true },
    }),
    prisma.relationship.findMany({
      select: { sourceId: true, targetId: true },
    }),
  ]);

  console.log(
    `Found ${entities.length} entities, ${relationships.length} relationships`,
  );

  if (entities.length === 0) {
    console.log('No entities found. Run the worker to extract entities first.');
    await prisma.$disconnect();
    return;
  }

  const ids = entities.map((e) => e.id);
  const { find, union } = makeUnionFind(ids);

  for (const rel of relationships) {
    union(rel.sourceId, rel.targetId);
  }

  // Group entities by root
  const groups = new Map<string, typeof entities>();
  for (const entity of entities) {
    const root = find(entity.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(entity);
  }

  const communities = [...groups.values()].filter(
    (group) => group.length >= MIN_COMMUNITY_SIZE,
  );

  console.log(
    `Found ${communities.length} communities (min size ${MIN_COMMUNITY_SIZE})`,
  );

  // Clear old community assignments
  await prisma.entity.updateMany({ data: { communityId: null } });
  await prisma.community.deleteMany({});

  for (let i = 0; i < communities.length; i++) {
    const group = communities[i];
    const entityNames = group.map((e) => `${e.name} (${e.type})`).join(', ');
    console.log(
      `Community ${i + 1}/${communities.length}: ${group.length} entities`,
    );

    let summary: string;
    let title: string;
    try {
      const prompt =
        `You are summarizing a cluster of related Islamic knowledge entities for a RAG system.\n\n` +
        `Entities in this cluster:\n${entityNames}\n\n` +
        `Write a concise 2-3 sentence summary of what this cluster represents thematically. ` +
        `Then on the next line write "TITLE: <short title (3-5 words)>".`;

      const response = await complete([{ role: 'user', content: prompt }]);
      const titleMatch = response.match(/TITLE:\s*(.+)/i);
      title = titleMatch ? titleMatch[1].trim() : `Community ${i + 1}`;
      summary = response.replace(/TITLE:\s*.+/i, '').trim();
    } catch (err) {
      console.warn(`  Failed to generate summary: ${err}`);
      title = `Community ${i + 1}`;
      summary = entityNames;
    }

    let embeddingVector: number[] | null = null;
    try {
      embeddingVector = await embed(summary);
    } catch {
      // Non-fatal
    }

    const community = await prisma.community.create({
      data: { title, summary, level: 0 },
      select: { id: true },
    });

    if (embeddingVector) {
      const vectorLiteral = `[${embeddingVector.join(',')}]`;
      await prisma.$executeRaw`
        UPDATE "Community"
        SET embedding = ${vectorLiteral}::vector
        WHERE id = ${community.id}
      `;
    }

    await prisma.entity.updateMany({
      where: { id: { in: group.map((e) => e.id) } },
      data: { communityId: community.id },
    });
  }

  console.log('Community build complete.');
  await prisma.$disconnect();
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
