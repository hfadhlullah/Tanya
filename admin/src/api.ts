const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const AUTH_EXPIRED_EVENT = 'tanya-admin-auth-expired';

function adminKey() {
  return localStorage.getItem('tanya_admin_key') ?? '';
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'x-demo-admin-key': adminKey(),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data.message ?? `HTTP ${res.status}`;

    if (res.status === 401 && message === 'Invalid demo admin key') {
      localStorage.removeItem('tanya_admin_key');
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      throw new Error('Admin key tidak valid. Masuk lagi dengan nilai DEMO_ADMIN_KEY dari backend/.env.');
    }

    throw new Error(message);
  }
  return data as T;
}

export { AUTH_EXPIRED_EVENT };

export interface UstadzApplication {
  id: string;
  publicName: string;
  bio?: string | null;
  credentials?: string | null;
  publicProfile?: string | null;
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
  type: 'QURAN' | 'HADITH' | 'USTADZ_CONTENT';
  title: string;
  reference?: string | null;
  license?: string | null;
  language: string;
  createdAt: string;
  _count: { corpusChunks: number; citations: number };
}

export interface ImportCorpusPayload {
  type: 'QURAN' | 'HADITH';
  title: string;
  reference?: string;
  license: string;
  language?: 'id';
  files: File[];
}

export interface CorpusImportResult {
  source: CorpusSource;
  importSummary: {
    type: 'QURAN' | 'HADITH';
    fileName: string;
    filesProcessed: string[];
    recordsReceived: number;
    chunksCreated: number;
    embeddingJobsQueued: number;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  actor: { email: string; displayName?: string | null };
  metadata?: {
    verifyingUstadzId?: string;
    questionText?: string;
    reviewedBody?: string;
    [key: string]: unknown;
  };
}

export interface CreateUstadzPayload {
  email: string;
  password: string;
  publicName: string;
}

export interface ApproveUstadzPayload {
  publicName?: string;
  bio?: string;
  credentials?: string;
  publicProfile?: string;
  specialties?: string[];
  madhhab?: string;
}

export const api = {
  createUstadz: (body: CreateUstadzPayload) =>
    req('/admin/ustadz', { method: 'POST', body: JSON.stringify(body) }),
  approveUstadzWithProfile: (profileId: string, body: ApproveUstadzPayload) =>
    req(`/admin/ustadz/${profileId}/approve`, { method: 'PATCH', body: JSON.stringify(body) }),
  deactivateUstadz: (profileId: string) =>
    req(`/admin/ustadz/${profileId}/deactivate`, { method: 'PATCH' }),
  listUstadzApplications: () => req<UstadzApplication[]>('/admin/ustadz-applications'),
  approveUstadz: (id: string) => req(`/ustadz/${id}/approve`, { method: 'PATCH' }),
  rejectUstadz: (id: string) => req(`/ustadz/${id}/reject`, { method: 'PATCH' }),

  listSensitiveRules: () => req<SensitiveRule[]>('/admin/sensitive-rules'),
  createSensitiveRule: (body: object) =>
    req('/admin/sensitive-rules', { method: 'POST', body: JSON.stringify(body) }),
  updateSensitiveRule: (id: string, body: object) =>
    req(`/admin/sensitive-rules/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  listCorpusSources: () => req<CorpusSource[]>('/admin/corpus-sources'),
  importCorpus: (body: ImportCorpusPayload) => {
    const form = new FormData();
    form.append('type', body.type);
    form.append('title', body.title);
    form.append('license', body.license);
    form.append('language', body.language ?? 'id');
    if (body.reference) form.append('reference', body.reference);
    if (body.files.length === 1) {
      form.append('file', body.files[0]);
    } else {
      body.files.forEach((file) => form.append('files', file));
    }
    return req<CorpusImportResult>('/corpus/import', { method: 'POST', body: form });
  },
  listAuditLogs: (params?: { action?: string; search?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.action) qs.set('action', params.action);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return req<{ data: AuditLog[]; total: number; page: number; limit: number }>(
      `/admin/audit-logs${query ? '?' + query : ''}`,
    );
  },
};
