import { Injectable } from '@nestjs/common';

type AnswerBankMatch = {
  answerId: string;
  score: number;
};

@Injectable()
export class AnswerBankService {
  async findVerifiedMatch(_questionText: string): Promise<AnswerBankMatch | null> {
    // Semantic matching will be implemented with pgvector raw SQL once embeddings are wired.
    return null;
  }
}
