import { useEffect, useState } from 'react';
import { api, type AuditLog } from '../api';

export function AuditLogsPage() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setData(await api.listAuditLogs());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function actionBadge(action: string) {
    const map: Record<string, string> = {
      ANSWER_APPROVED: 'badge-green',
      ANSWER_EDITED: 'badge-yellow',
      ANSWER_REJECTED: 'badge-red',
    };
    return <span className={`badge ${map[action] ?? 'badge-gray'}`}>{action}</span>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>

      {loading && <p className="empty">Memuat...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Aksi</th>
                <th>Entity</th>
                <th>ID Entity</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={5} className="empty">Tidak ada log.</td></tr>
              )}
              {data.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('id-ID')}
                  </td>
                  <td>{log.actor.displayName ?? log.actor.email}</td>
                  <td>{actionBadge(log.action)}</td>
                  <td>{log.entity}</td>
                  <td style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: 11 }}>
                    {log.entityId.slice(0, 12)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
