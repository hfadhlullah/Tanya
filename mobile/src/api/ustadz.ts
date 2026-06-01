import { authHeaders, getStoredToken } from './auth';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function headers() {
  const token = await getStoredToken();
  if (!token) throw new Error('Sesi habis. Silakan login ulang.');
  return authHeaders(token);
}

export interface UstadzProfile {
  id: string;
  userId: string;
  publicName: string;
  bio?: string | null;
  credentials?: string | null;
  publicProfile?: string | null;
  specialties: string[];
  madhhab?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface OnboardUstadzPayload {
  publicName: string;
  bio?: string;
  credentials?: string;
  specialties: string[];
  madhhab?: string;
  gatedTopics?: string[];
}

export interface ReviewAnswer {
  id: string;
  body: string;
  status: string;
  language: string;
  question: {
    id: string;
    text: string;
    topic?: string | null;
    isSensitive: boolean;
  };
  citations: { id: string; label: string; excerpt: string }[];
}

export interface ReviewQueue {
  profileId: string;
  answers: ReviewAnswer[];
}

export async function getMyProfile() {
  const res = await fetch(`${apiUrl}/ustadz/me/profile`, {
    headers: await headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Profil tidak dapat dimuat.');
  return data as UstadzProfile | null;
}

export async function updateProfile(payload: OnboardUstadzPayload) {
  const res = await fetch(`${apiUrl}/ustadz/me/profile`, {
    method: 'PATCH',
    headers: await headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Update profil gagal.');
  return data as { profile: UstadzProfile };
}

export async function onboardUstadz(payload: OnboardUstadzPayload) {
  const res = await fetch(`${apiUrl}/ustadz/onboarding`, {
    method: 'POST',
    headers: await headers(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Pendaftaran ustadz gagal.');
  return data as { profile: UstadzProfile; locked: boolean };
}

export async function getUstadzDashboard() {
  const res = await fetch(`${apiUrl}/ustadz/me/dashboard`, {
    headers: await headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Dashboard tidak dapat dimuat.');
  return data as { profile: UstadzProfile; locked: boolean };
}

export async function getReviewQueue() {
  const res = await fetch(`${apiUrl}/ustadz/me/review-queue`, {
    headers: await headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Antrian review tidak dapat dimuat.');
  return data as ReviewQueue;
}

export async function verifyAnswer(answerId: string, body?: string) {
  const res = await fetch(`${apiUrl}/ustadz/answers/${answerId}/verify`, {
    method: 'PATCH',
    headers: await headers(),
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Verifikasi gagal.');
  return data;
}
