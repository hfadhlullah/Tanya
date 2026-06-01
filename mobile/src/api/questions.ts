import { authHeaders, getStoredToken } from './auth';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Question = {
  id: string;
  text: string;
  sessionId: string | null;
  language: string;
  topic?: string | null;
  isSensitive: boolean;
  status: string;
  createdAt: string;
};

export type CreateQuestionResponse = {
  question: Question;
  route: 'answer_pipeline' | 'ustadz_review';
  answer: null;
};

async function headers() {
  const token = await getStoredToken();
  if (!token) throw new Error('Sesi habis. Silakan login ulang.');
  return authHeaders(token);
}

export async function createQuestion(input: { text: string; sessionId: string }) {
  const response = await fetch(`${apiUrl}/questions`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify({ language: 'id', text: input.text, sessionId: input.sessionId }),
  });

  if (!response.ok) {
    throw new Error('Pertanyaan belum bisa dikirim. Coba lagi sebentar.');
  }

  return (await response.json()) as CreateQuestionResponse;
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
