import { authHeaders, getStoredToken } from './auth';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

async function headers() {
  const token = await getStoredToken();
  if (!token) throw new Error('Sesi habis.');
  return authHeaders(token);
}

export interface PublicUstadz {
  id: string;
  publicName: string;
  specialties: string[];
  madhhab?: string | null;
  bio?: string | null;
}

export async function getMyPreferences(): Promise<{ preferredUstadzIds: string[] }> {
  const res = await fetch(`${apiUrl}/auth/me/preferences`, { headers: await headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Gagal memuat preferensi.');
  return data;
}

export async function updateMyPreferences(preferredUstadzIds: string[]): Promise<{ preferredUstadzIds: string[] }> {
  const res = await fetch(`${apiUrl}/auth/me/preferences`, {
    method: 'PATCH',
    headers: await headers(),
    body: JSON.stringify({ preferredUstadzIds }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Gagal menyimpan preferensi.');
  return data;
}

export async function listPublicUstadz(): Promise<PublicUstadz[]> {
  const res = await fetch(`${apiUrl}/ustadz/public`, { headers: await headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Gagal memuat daftar ustadz.');
  return data;
}
