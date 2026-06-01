import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredToken, guestLogin } from './src/api/auth';
import { OnboardingScreen } from './src/screens/onboarding/OnboardingScreen';
import { AskScreen } from './src/screens/AskScreen';

const ONBOARDED_KEY = '@tanya_onboarded';

type Screen = 'loading' | 'onboarding' | 'app';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    const token = await getStoredToken();
    if (!token) {
      await guestLogin();
    }

    const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
    setSessionKey((k) => k + 1);
    setScreen(onboarded === 'true' ? 'app' : 'onboarding');
  }

  async function handleOnboardingComplete() {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    setSessionKey((k) => k + 1);
    setScreen('app');
  }

  if (screen === 'loading') return null;
  if (screen === 'onboarding') return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  return <AskScreen key={sessionKey} onResetAuth={bootstrap} />;
}
