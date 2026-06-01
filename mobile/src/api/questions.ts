const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Question = {
  id: string;
  text: string;
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

function demoAuthHeaders(userId: string) {
  return {
    'Content-Type': 'application/json',
    'x-demo-user-id': userId,
  };
}

export async function createQuestion(input: { userId: string; text: string }) {
  const response = await fetch(`${apiUrl}/questions`, {
    method: 'POST',
    headers: demoAuthHeaders(input.userId),
    body: JSON.stringify({ language: 'id', text: input.text }),
  });

  if (!response.ok) {
    throw new Error('Pertanyaan belum bisa dikirim. Coba lagi sebentar.');
  }

  return (await response.json()) as CreateQuestionResponse;
}

export async function listQuestions(userId: string) {
  const response = await fetch(`${apiUrl}/questions/me`, {
    headers: demoAuthHeaders(userId),
  });

  if (!response.ok) {
    throw new Error('Riwayat pertanyaan belum bisa dimuat.');
  }

  return (await response.json()) as Question[];
}
