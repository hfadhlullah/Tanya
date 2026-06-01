import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ClassificationResult = {
  isSensitive: boolean;
  topic?: string;
};

const fallbackSensitivePatterns = [
  { topic: 'kekerasan', pattern: /\b(jihad|perang|bom|membunuh|kekerasan)\b/i },
  { topic: 'takfir', pattern: /\b(kafirkan|takfir|murtadkan)\b/i },
  { topic: 'apostasy', pattern: /\b(murtad|keluar islam|pindah agama)\b/i },
  { topic: 'talak dan perceraian', pattern: /\b(talak|cerai|rujuk|iddah)\b/i },
  { topic: 'waris', pattern: /\b(waris|faraid|pembagian harta)\b/i },
  { topic: 'medis agama', pattern: /\b(obat|dokter|medis|bunuh diri|depresi)\b/i },
];

@Injectable()
export class SafetyService {
  constructor(private readonly prisma: PrismaService) {}

  async classifyQuestion(text: string): Promise<ClassificationResult> {
    const rules = await this.prisma.sensitiveRule.findMany({
      where: { isActive: true, scope: 'GLOBAL' },
      select: { topic: true, pattern: true },
    });

    for (const rule of rules) {
      if (rule.pattern && this.matchesPattern(rule.pattern, text)) {
        return { isSensitive: true, topic: rule.topic };
      }
    }

    for (const rule of fallbackSensitivePatterns) {
      if (rule.pattern.test(text)) {
        return { isSensitive: true, topic: rule.topic };
      }
    }

    return { isSensitive: false };
  }

  private matchesPattern(pattern: string, text: string) {
    try {
      return new RegExp(pattern, 'i').test(text);
    } catch {
      return false;
    }
  }
}
