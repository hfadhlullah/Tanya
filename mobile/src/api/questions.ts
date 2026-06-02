import { authHeaders, getStoredToken } from './auth';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Citation = {
  id: string;
  label: string;
  excerpt: string;
  source?: { type: string } | null;
};

export type Answer = {
  id: string;
  body: string;
  status: string;
  language: string;
  label?: string | null;
  createdAt?: string | null;
  citations: Citation[];
  verifyingUstadz?: { publicName: string; status: string } | null;
};

export type Question = {
  id: string;
  text: string;
  sessionId: string | null;
  language: string;
  topic?: string | null;
  isSensitive: boolean;
  status: string;
  createdAt: string;
  answers: Answer[];
};

export type CreateQuestionResponse = {
  question: Question;
  route: 'answer_pipeline' | 'verified_answer_bank' | 'ustadz_review' | 'conversation';
  answer: Answer | null;
};

export type QuestionIntentHint = 'conversation' | 'rag';

async function headers() {
  const token = await getStoredToken();
  if (!token) throw new Error('Sesi habis. Silakan login ulang.');
  return authHeaders(token);
}

export async function createQuestion(input: {
  text: string;
  sessionId: string;
  intentHint: QuestionIntentHint;
}) {
  const response = await fetch(`${apiUrl}/questions`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({
      language: 'id',
      text: input.text,
      sessionId: input.sessionId,
      intentHint: input.intentHint,
    }),
  });

  if (!response.ok) {
    throw new Error('Pertanyaan belum bisa dikirim. Coba lagi sebentar.');
  }

  return (await response.json()) as CreateQuestionResponse;
}

export async function deleteSession(sessionId: string) {
  const response = await fetch(`${apiUrl}/questions/session/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: await headers(),
  });

  if (!response.ok) {
    throw new Error('Sesi gagal dihapus.');
  }
}

export async function listQuestions() {
  const response = await fetch(`${apiUrl}/questions/me`, {
    headers: await headers(),
  });

  if (!response.ok) {
    throw new Error('Riwayat pertanyaan belum bisa dimuat.');
  }

  return (await response.json()) as Question[];
}
