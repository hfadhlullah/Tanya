import AsyncStorage from '@react-native-async-storage/async-storage';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const TOKEN_KEY = '@tanya_token';
export const USER_KEY = '@tanya_user';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  isGuest: boolean;
}

export async function guestLogin() {
  const res = await fetch(`${apiUrl}/auth/guest`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Guest session gagal.');
  await AsyncStorage.multiSet([
    [TOKEN_KEY, data.token],
    [USER_KEY, JSON.stringify(data.user)],
  ]);
  return data as { token: string; user: AuthUser };
}

export async function register(email: string, password: string, displayName?: string) {
  const res = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Pendaftaran gagal.');

  await AsyncStorage.multiSet([
    [TOKEN_KEY, data.token],
    [USER_KEY, JSON.stringify(data.user)],
  ]);
  return data as { token: string; user: AuthUser };
}

export async function login(email: string, password: string) {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Login gagal. Cek email & kata sandi.');

  await AsyncStorage.multiSet([
    [TOKEN_KEY, data.token],
    [USER_KEY, JSON.stringify(data.user)],
  ]);
  return data as { token: string; user: AuthUser };
}

export async function logout() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getStoredToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function authHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
