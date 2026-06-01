import { useEffect, useRef, useState } from 'react';
import { createQuestion, listQuestions, type Question } from '../api/questions';
import { getStoredUser, logout, type AuthUser } from '../api/auth';
import { AskTemplate } from '../components/templates/AskTemplate';

function makeSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export interface ChatSession {
  sessionId: string;
  title: string;
  questions: Question[];
}

interface Props {
  onResetAuth?: () => void;
}

export function AskScreen({ onResetAuth }: Props) {
  const [loading, setLoading] = useState(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
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

  async function handleSubmit(text: string) {
    setLoading(true);
    try {
      await createQuestion({ text, sessionId: currentSessionId });
      await refreshQuestions();
      if (isGuest.current) {
        setShowLoginGate(true);
      }
    } catch {
      // input bar handles its own state
    } finally {
      setLoading(false);
    }
  }

  function handleLoginSuccess() {
    setShowLoginGate(false);
    isGuest.current = false;
    checkGuestStatus();
    refreshQuestions().catch(() => {});
  }

  function handleNewChat() {
    setCurrentSessionId(makeSessionId());
    setPrefill(undefined);
  }

  function handleSessionSelect(sessionId: string) {
    setCurrentSessionId(sessionId);
  }

  async function handleLogout() {
    await logout();
    onResetAuth?.();
  }

  // questions for current session
  const currentQuestions = allQuestions.filter((q) => q.sessionId === currentSessionId);

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
    />
  );
}
