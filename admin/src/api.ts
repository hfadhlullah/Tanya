const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

function adminKey() {
  return localStorage.getItem('tanya_admin_key') ?? '';
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-demo-admin-key': adminKey(),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
  return data as T;
}

export interface UstadzApplication {
  id: string;
  publicName: string;
  bio?: string | null;
  credentials?: string | null;
  specialties: string[];
  madhhab?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: { id: string; email: string; displayName?: string | null };
  credentialFiles: { id: string; label: string; fileUrl: string }[];
  sensitiveRules: { id: string; topic: string }[];
}

export interface SensitiveRule {
  id: string;
  scope: 'GLOBAL' | 'USTADZ';
  topic: string;
  pattern?: string | null;
  isActive: boolean;
  createdAt: string;
  ustadz?: { publicName: string } | null;
}

export interface CorpusSource {
  id: string;
  title: string;
  author?: string | null;
  language: string;
  createdAt: string;
  _count: { corpusChunks: number; citations: number };
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  actor: { email: string; displayName?: string | null };
  metadata?: Record<string, unknown>;
}

export interface CreateUstadzPayload {
  email: string;
  password: string;
  publicName: string;
  bio?: string;
  credentials?: string;
  publicProfile?: string;
  specialties?: string[];
  madhhab?: string;
}

export const api = {
  createUstadz: (body: CreateUstadzPayload) =>
    req('/admin/ustadz', { method: 'POST', body: JSON.stringify(body) }),
  listUstadzApplications: () => req<UstadzApplication[]>('/admin/ustadz-applications'),
  approveUstadz: (id: string) => req(`/ustadz/${id}/approve`, { method: 'PATCH' }),
  rejectUstadz: (id: string) => req(`/ustadz/${id}/reject`, { method: 'PATCH' }),

  listSensitiveRules: () => req<SensitiveRule[]>('/admin/sensitive-rules'),
  createSensitiveRule: (body: object) =>
    req('/admin/sensitive-rules', { method: 'POST', body: JSON.stringify(body) }),
  updateSensitiveRule: (id: string, body: object) =>
    req(`/admin/sensitive-rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  listCorpusSources: () => req<CorpusSource[]>('/admin/corpus-sources'),
  listAuditLogs: () => req<AuditLog[]>('/admin/audit-logs'),
};
