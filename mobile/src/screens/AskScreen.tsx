import { useEffect, useRef, useState } from 'react';
import {
  createQuestion,
  listQuestions,
  type Answer,
  type Question,
  type QuestionIntentHint,
} from '../api/questions';
import { getStoredUser, logout, type AuthUser, USER_KEY } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AskTemplate } from '../components/templates/AskTemplate';

const SENSITIVE_QUESTION_REFUSAL = {
  id: 'sensitive-refusal',
  body: 'Maaf, pertanyaan ini tidak dapat kami jawab karena termasuk topik yang dilarang atau berisiko. Silakan ajukan pertanyaan seputar ibadah, akhlak, atau ilmu Islam yang aman dan bermanfaat.',
  status: 'VERIFIED',
  language: 'id',
  label: 'Pertanyaan sensitif · tidak dapat dijawab',
  citations: [],
  verifyingUstadz: null,
};

function makeSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export interface ChatSession {
  sessionId: string;
  title: string;
  questions: Question[];
}

type PendingMode = QuestionIntentHint;

function predictPendingMode(text: string): PendingMode {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const conversationalPhrases = new Set([
    'hi',
    'hai',
    'halo',
    'hello',
    'assalamualaikum',
    'assalamu alaikum',
    'assalamualaikum warahmatullahi wabarakatuh',
    'assalamu alaikum warahmatullahi wabarakatuh',
    'salam',
    'hey',
    'yo',
    'whats up',
    'whatsup',
    'apa kabar',
    'gimana kabarnya',
    'lagi ngapain',
    'terima kasih',
    'makasih',
    'makasi',
    'thanks',
    'thanks ya',
    'oke',
    'ok',
    'sip',
    'bisa bantu',
  ]);

  return conversationalPhrases.has(normalized) ? 'conversation' : 'rag';
}

function buildConversationalFallback(text: string): Answer {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let body = 'Siap, saya di sini. Mau tanya apa?';

  if (normalized.includes('assalamualaikum') || normalized.includes('assalamu alaikum')) {
    body = 'Waalaikumsalam warahmatullahi wabarakatuh.';
  } else if (
    normalized === 'halo' ||
    normalized === 'hai' ||
    normalized === 'hi' ||
    normalized === 'hello'
  ) {
    body = 'Halo. Ada yang ingin kamu tanyakan?';
  } else if (
    normalized.includes('terima kasih') ||
    normalized.includes('makasih') ||
    normalized.includes('makasi') ||
    normalized.includes('thanks')
  ) {
    body = 'Sama-sama.';
  }

  return {
    id: `conversation-fallback-${Date.now()}`,
    body,
    status: 'AI_PENDING',
    language: 'id',
    label: null,
    citations: [],
    verifyingUstadz: null,
  };
}

function shouldForceConversationalAnswer(
  intentHint: PendingMode,
  answer: Answer | null | undefined,
) {
  if (intentHint !== 'conversation' || !answer) {
    return false;
  }

  const label = answer.label?.toLowerCase() ?? '';
  return answer.citations.length > 0 || label.includes('al-qur') || label.includes('sunnah');
}

interface Props {
  onResetAuth?: () => void;
  onBack?: () => void;
}

export function AskScreen({ onResetAuth, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [pendingMode, setPendingMode] = useState<PendingMode>('rag');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [newAnswerIds, setNewAnswerIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [prefill, setPrefill] = useState<string>();
  const [currentSessionId, setCurrentSessionId] = useState(() => makeSessionId());
  const isGuest = useRef(false);

  useEffect(() => {
    checkGuestStatus();
    refreshQuestions().catch(() => {});
  }, []);

  async function checkGuestStatus() {
    const stored = await getStoredUser();
    isGuest.current = stored?.isGuest ?? false;
    setUser(stored);
  }

  async function refreshQuestions() {
    const next = await listQuestions();
    setAllQuestions(next);
  }

  const guestQuestionCount = allQuestions.filter(
    (q) => !q.id.startsWith('optimistic-'),
  ).length;
  const guestBlocked = isGuest.current && guestQuestionCount >= 1;

  async function handleSubmit(text: string) {
    if (guestBlocked || !text) {
      setShowLoginGate(true);
      return;
    }
    const intentHint = predictPendingMode(text);
    setPendingMode(intentHint);
    setLoading(true);

    // Show question immediately with empty answers (triggers ProcessingIndicator)
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticQuestion: Question = {
      id: optimisticId,
      text,
      sessionId: currentSessionId,
      language: 'id',
      isSensitive: false,
      status: 'RECEIVED',
      createdAt: new Date().toISOString(),
      answers: [],
    };
    setAllQuestions((prev) => [optimisticQuestion, ...prev]);

    try {
      const result = await createQuestion({
        text,
        sessionId: currentSessionId,
        intentHint,
      });
      const rawAnswer = result.answer
        ?? (result.question.isSensitive || result.route === 'ustadz_review'
          ? {
              ...SENSITIVE_QUESTION_REFUSAL,
              id: `${SENSITIVE_QUESTION_REFUSAL.id}-${result.question.id}`,
              language: result.question.language,
            }
          : null);
      const answer = shouldForceConversationalAnswer(intentHint, rawAnswer)
        ? buildConversationalFallback(text)
        : rawAnswer;
      const newQuestion: Question = {
        ...result.question,
        answers: answer ? [answer] : [],
      };
      if (answer) {
        setNewAnswerIds((prev) => new Set(prev).add(answer.id));
      }
      // Replace optimistic entry with real question
      setAllQuestions((prev) =>
        prev.map((q) => (q.id === optimisticId ? newQuestion : q)),
      );
      if (isGuest.current) {
        setShowLoginGate(true);
      }
    } catch {
      // Remove optimistic entry on error
      setAllQuestions((prev) => prev.filter((q) => q.id !== optimisticId));
    } finally {
      setLoading(false);
      setPendingMode('rag');
    }
  }

  async function handleLoginSuccess() {
    setShowLoginGate(false);
    isGuest.current = false;
    const user = await getStoredUser();
    if (user?.role === 'USTADZ') {
      onResetAuth?.();
      return;
    }
    checkGuestStatus();
    refreshQuestions().catch(() => {});
  }

  function handleNewChat() {
    setCurrentSessionId(makeSessionId());
    setNewAnswerIds(new Set());
    setPrefill(undefined);
  }

  function handleSessionSelect(sessionId: string) {
    setCurrentSessionId(sessionId);
    setNewAnswerIds(new Set());
  }

  function handleEditQuestion(question: Question) {
    setAllQuestions((prev) => prev.filter((q) => q.id !== question.id));
    setPrefill(question.text);
  }

  function handleDeleteSession(sessionId: string) {
    setAllQuestions((prev) => prev.filter((q) => q.sessionId !== sessionId));
    if (sessionId === currentSessionId) {
      setCurrentSessionId(makeSessionId());
    }
  }

  async function handleUserUpdated(updated: AuthUser) {
    setUser(updated);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
  }

  async function handleLogout() {
    await logout();
    onResetAuth?.();
  }

  // questions for current session — oldest first (chat order)
  const currentQuestions = allQuestions
    .filter((q) => q.sessionId === currentSessionId)
    .slice()
    .reverse();

  // build sessions list for sidebar (one entry per unique sessionId, most recent first)
  const sessions: ChatSession[] = Object.values(
    allQuestions.reduce<Record<string, ChatSession>>((acc, q) => {
      const sid = q.sessionId ?? 'unknown';
      if (!acc[sid]) {
        acc[sid] = { sessionId: sid, title: q.text, questions: [] };
      }
      acc[sid].questions.push(q);
      return acc;
    }, {}),
  ).sort((a, b) => {
    const aTime = new Date(a.questions[0].createdAt).getTime();
    const bTime = new Date(b.questions[0].createdAt).getTime();
    return bTime - aTime;
  });

  return (
    <AskTemplate
      loading={loading}
      pendingMode={pendingMode}
      guestBlocked={guestBlocked}
      questions={currentQuestions}
      sessions={sessions}
      currentSessionId={currentSessionId}
      user={user}
      prefill={prefill}
      showLoginGate={showLoginGate}
      onSubmit={handleSubmit}
      onPrefillConsumed={() => setPrefill(undefined)}
      onLoginSuccess={handleLoginSuccess}
      onLoginDismiss={() => setShowLoginGate(false)}
      onSuggestionSelect={(text) => setPrefill(text)}
      onNewChat={handleNewChat}
      onSessionSelect={handleSessionSelect}
      onLogout={handleLogout}
      onLoginPress={() => setShowLoginGate(true)}
      onEditQuestion={handleEditQuestion}
      onDeleteSession={handleDeleteSession}
      onUserUpdated={handleUserUpdated}
      newAnswerIds={newAnswerIds}
      onBack={onBack}
    />
  );
}
