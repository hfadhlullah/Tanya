import { useEffect, useRef, useState } from 'react';
import { api, type AuditLog } from '../api';

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'ANSWER_APPROVED', label: 'Answer Approved' },
  { value: 'ANSWER_EDITED', label: 'Answer Edited' },
  { value: 'ANSWER_REJECTED', label: 'Answer Rejected' },
  { value: 'QUESTION_CLASSIFIED', label: 'Question Classified' },
  { value: 'USTADZ_APPROVED', label: 'Ustadz Approved' },
  { value: 'SENSITIVE_RULE_CHANGED', label: 'Sensitive Rule Changed' },
];

const ACTION_BADGE: Record<string, string> = {
  ANSWER_APPROVED: 'badge-green',
  ANSWER_EDITED: 'badge-yellow',
  ANSWER_REJECTED: 'badge-red',
};

const PAGE_LIMIT = 20;

export function AuditLogsPage() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterAction, filterSearch]);

  useEffect(() => {
    load(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function load(p: number) {
    setLoading(true);
    setError('');
    try {
      const res = await api.listAuditLogs({
        action: filterAction || undefined,
        search: filterSearch || undefined,
        page: p,
        limit: PAGE_LIMIT,
      });
      setData(res.data);
      setTotal(res.total);
      if (p !== page) setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterAction(val: string) {
    setFilterAction(val);
    setPage(1);
  }

  function handleSearch(val: string) {
    setFilterSearch(val);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <button className="secondary" onClick={() => load(page)}>Refresh</button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Cari aktor atau pertanyaan..."
          value={filterSearch}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          value={filterAction}
          onChange={(e) => handleFilterAction(e.target.value)}
          style={{ minWidth: 180 }}
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aktor</th>
              <th>Aksi</th>
              <th>Entity</th>
              <th>ID Entity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="empty">Memuat...</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={6} className="empty">Tidak ada log.</td></tr>
            )}
            {!loading && data.map((log) => (
              <tr key={log.id}>
                <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                  {new Date(log.createdAt).toLocaleString('id-ID')}
                </td>
                <td style={{ fontSize: 13 }}>{log.actor?.displayName ?? log.actor?.email ?? '—'}</td>
                <td>
                  <span className={`badge ${ACTION_BADGE[log.action] ?? 'badge-gray'}`}>
                    {log.action}
                  </span>
                </td>
                <td style={{ fontSize: 13 }}>{log.entity}</td>
                <td style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                  {log.entityId?.slice(0, 12)}…
                </td>
                <td>
                  <button
                    className="secondary"
                    style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={() => setSelectedLog(log)}
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderTop: '1px solid var(--line)',
          fontSize: 13, color: 'var(--muted)',
        }}>
          <button
            className="secondary"
            style={{ padding: '4px 12px' }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          <span>Halaman {page} dari {totalPages} &middot; {total} log</span>
          <button
            className="secondary"
            style={{ padding: '4px 12px' }}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Berikutnya →
          </button>
        </div>
      </div>

      {/* Detail modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal" style={{ maxWidth: 560, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge ${ACTION_BADGE[selectedLog.action] ?? 'badge-gray'}`}>
                {selectedLog.action}
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {new Date(selectedLog.createdAt).toLocaleString('id-ID')}
              </span>
            </div>

            <DetailRow label="Aktor" value={selectedLog.actor?.displayName ?? selectedLog.actor?.email ?? '—'} />
            <DetailRow label="Entity" value={`${selectedLog.entity} · ${selectedLog.entityId}`} mono />

            {selectedLog.metadata?.questionText && (
              <DetailRow label="Pertanyaan" value={selectedLog.metadata.questionText as string} />
            )}
            {selectedLog.metadata?.reviewedBody && (
              <DetailRow label="Jawaban Ustadz" value={selectedLog.metadata.reviewedBody as string} />
            )}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).some(
              (k) => !['questionText', 'reviewedBody', 'verifyingUstadzId'].includes(k)
            ) && (
              <div className="form-row">
                <label>Metadata Lain</label>
                <pre style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 11,
                  overflowX: 'auto',
                  margin: 0,
                }}>
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(selectedLog.metadata).filter(
                        ([k]) => !['questionText', 'reviewedBody', 'verifyingUstadzId'].includes(k)
                      )
                    ),
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            <div className="modal-actions">
              <button className="secondary" onClick={() => setSelectedLog(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="form-row">
      <label>{label}</label>
      <div style={{
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: mono ? 'monospace' : undefined,
        color: 'var(--ink)',
      }}>
        {value}
      </div>
    </div>
  );
}
