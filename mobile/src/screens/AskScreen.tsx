import { useEffect, useState } from 'react';
import { createQuestion, listQuestions, type Question } from '../api/questions';
import { AskTemplate } from '../components/templates/AskTemplate';

const demoUserId = process.env.EXPO_PUBLIC_DEMO_USER_ID ?? 'demo-user';

export function AskScreen() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [questions, setQuestions] = useState<Question[]>([]);

  async function refreshQuestions() {
    const nextQuestions = await listQuestions(demoUserId);
    setQuestions(nextQuestions);
  }

  async function handleSubmit(text: string) {
    setLoading(true);
    setMessage(undefined);

    try {
      const result = await createQuestion({ userId: demoUserId, text });
      setMessage(
        result.route === 'ustadz_review'
          ? 'Pertanyaan ini langsung diarahkan ke ustadz.'
          : 'Pertanyaan diterima. Tanya sedang mencari jawaban paling aman.',
      );
      await refreshQuestions();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Terjadi kendala. Coba lagi sebentar.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshQuestions().catch(() => setMessage('Riwayat belum bisa dimuat.'));
  }, []);

  return <AskTemplate loading={loading} message={message} questions={questions} onSubmit={handleSubmit} />;
}
