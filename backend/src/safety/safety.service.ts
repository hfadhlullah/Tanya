import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmClientService } from '../answers/llm-client.service';

type ClassificationResult = {
  isSensitive: boolean;
  topic?: string;
};

const fallbackSensitivePatterns = [
  { topic: 'kekerasan', pattern: /\b(jihad|perang|bom|membunuh|kekerasan)\b/i },
  { topic: 'takfir', pattern: /\b(kafirkan|takfir|murtadkan)\b/i },
  { topic: 'apostasy', pattern: /\b(murtad|keluar islam|pindah agama)\b/i },
  { topic: 'talak dan perceraian', pattern: /\b(talak|cerai|rujuk|iddah)\b/i },
  {
    topic: 'medis agama',
    pattern: /\b(obat|dokter|medis|bunuh diri|depresi)\b/i,
  },
];

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmClientService,
  ) {}

  async classifyQuestion(text: string): Promise<ClassificationResult> {
    // 1. DB rules (admin-configured)
    const rules = await this.prisma.sensitiveRule.findMany({
      where: { isActive: true, scope: 'GLOBAL' },
      select: { topic: true, pattern: true },
    });

    for (const rule of rules) {
      if (rule.pattern && this.matchesPattern(rule.pattern, text)) {
        return { isSensitive: true, topic: rule.topic };
      }
    }

    // 2. Hardcoded keyword patterns (clear-cut dangerous content only)
    for (const rule of fallbackSensitivePatterns) {
      if (rule.pattern.test(text)) {
        return { isSensitive: true, topic: rule.topic };
      }
    }

    // 3. LLM classifier for edge cases
    return this.llmClassify(text);
  }

  private async llmClassify(text: string): Promise<ClassificationResult> {
    try {
      const response = await this.llm.complete([
        {
          role: 'system',
          content:
            'Kamu adalah classifier konten Islam. Jawab hanya "YA" atau "TIDAK".\n' +
            'Pertanyaan dianggap SENSITIF jika berisi: ajakan kekerasan, takfir, murtad, ' +
            'atau membutuhkan fatwa personal dari ustadz untuk situasi hidup yang sangat serius.\n' +
            'Pertanyaan fiqh umum (shalat, puasa, zakat, waris, muamalah, aqidah, tafsir) TIDAK sensitif.',
        },
        {
          role: 'user',
          content: `Apakah pertanyaan ini sensitif? "${text}"`,
        },
      ]);

      const answer = response.trim().toUpperCase();
      const isSensitive = answer.startsWith('YA');
      this.logger.debug(
        `LLM classified "${text.slice(0, 60)}" → ${isSensitive ? 'SENSITIVE' : 'SAFE'}`,
      );
      return { isSensitive, topic: isSensitive ? 'llm-classified' : undefined };
    } catch (err) {
      this.logger.warn(`LLM classifier failed, defaulting to safe: ${err}`);
      return { isSensitive: false };
    }
  }

  private matchesPattern(pattern: string, text: string) {
    try {
      return new RegExp(pattern, 'i').test(text);
    } catch {
      return false;
    }
  }
}
