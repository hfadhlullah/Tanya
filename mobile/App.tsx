import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredToken, getStoredUser, guestLogin, type AuthUser } from './src/api/auth';
import { getMyProfile } from './src/api/ustadz';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { AskScreen } from './src/screens/AskScreen';
import { UstadzOnboardingScreen } from './src/screens/ustadz/UstadzOnboardingScreen';
import { UstadzDashboardScreen } from './src/screens/ustadz/UstadzDashboardScreen';
import { UstadzReviewQueueScreen } from './src/screens/ustadz/UstadzReviewQueueScreen';
import { UstadzReviewDetailScreen } from './src/screens/ustadz/UstadzReviewDetailScreen';
import type { ReviewAnswer } from './src/api/ustadz';

const ONBOARDED_KEY = '@tanya_onboarded';

type Screen =
  | 'loading'
  | 'onboarding'
  | 'app'
  | 'ustadz_onboarding'
  | 'ustadz_dashboard'
  | 'ustadz_queue'
  | 'ustadz_review_detail';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [sessionKey, setSessionKey] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<ReviewAnswer | null>(null);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    const token = await getStoredToken();
    if (!token) {
      await guestLogin();
    }

    const user = await getStoredUser();
    setSessionKey((k) => k + 1);

    if (user?.role === 'USTADZ') {
      const profile = await getMyProfile().catch(() => null);
      setScreen(profile?.status === 'APPROVED' ? 'ustadz_dashboard' : 'ustadz_onboarding');
      return;
    }

    const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
    setScreen(onboarded === 'true' ? 'app' : 'onboarding');
  }

  async function handleOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    setSessionKey((k) => k + 1);
    setScreen('app');
  }

  if (screen === 'loading') return null;

  if (screen === 'onboarding') return <OnboardingScreen onComplete={handleOnboardingComplete} />;

  if (screen === 'ustadz_onboarding') {
    return (
      <UstadzOnboardingScreen
        onComplete={() => setScreen('ustadz_dashboard')}
      />
    );
  }

  if (screen === 'ustadz_dashboard') {
    return (
      <UstadzDashboardScreen
        onOpenQueue={() => setScreen('ustadz_queue')}
        onLogout={bootstrap}
      />
    );
  }

  if (screen === 'ustadz_queue') {
    return (
      <UstadzReviewQueueScreen
        onSelect={(answer) => {
          setSelectedAnswer(answer);
          setScreen('ustadz_review_detail');
        }}
        onBack={() => setScreen('ustadz_dashboard')}
      />
    );
  }

  if (screen === 'ustadz_review_detail' && selectedAnswer) {
    return (
      <UstadzReviewDetailScreen
        answer={selectedAnswer}
        onDone={() => setScreen('ustadz_queue')}
        onBack={() => setScreen('ustadz_queue')}
      />
    );
  }

  return <AskScreen key={sessionKey} onResetAuth={bootstrap} />;
}
