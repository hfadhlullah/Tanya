import { Injectable, Logger } from '@nestjs/common';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);
  private readonly baseUrl = process.env.REQUESTY_BASE_URL ?? 'https://router.requesty.ai/v1';
  private readonly apiKey = process.env.REQUESTY_API_KEY ?? '';
  private readonly embeddingModel = process.env.REQUESTY_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small';
  private readonly chatModel = process.env.REQUESTY_CHAT_MODEL ?? 'gpt-4o-mini';

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.embeddingModel, input: text }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Embed failed ${res.status}: ${body}`);
      throw new Error(`Requesty embed failed: ${res.status}`);
    }

    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data[0].embedding;
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.chatModel, messages }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Complete failed ${res.status}: ${body}`);
      throw new Error(`Requesty complete failed: ${res.status}`);
    }

    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return json.choices[0].message.content;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
}
