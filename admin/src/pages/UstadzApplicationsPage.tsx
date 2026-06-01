import { useEffect, useState } from 'react';
import { api, type UstadzApplication } from '../api';

export function UstadzApplicationsPage() {
  const [data, setData] = useState<UstadzApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<UstadzApplication | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setData(await api.listUstadzApplications());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function approve(app: UstadzApplication) {
    setWorking(true);
    try {
      await api.approveUstadz(app.id);
      setSelected(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setWorking(false);
    }
  }

  async function reject(app: UstadzApplication) {
    if (!confirm(`Tolak aplikasi ${app.publicName}?`)) return;
    setWorking(true);
    try {
      await api.rejectUstadz(app.id);
      setSelected(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setWorking(false);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      PENDING: 'badge badge-yellow',
      APPROVED: 'badge badge-green',
      REJECTED: 'badge badge-red',
    };
    return <span className={map[status] ?? 'badge badge-gray'}>{status}</span>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Ustadz Applications</h1>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>

      {loading && <p className="empty">Memuat...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Keahlian</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={6} className="empty">Tidak ada aplikasi.</td></tr>
              )}
              {data.map((app) => (
                <tr key={app.id}>
                  <td style={{ fontWeight: 600 }}>{app.publicName}</td>
                  <td>{app.user.email}</td>
                  <td>{app.specialties.join(', ')}</td>
                  <td>{statusBadge(app.status)}</td>
                  <td style={{ color: 'var(--muted)' }}>{new Date(app.createdAt).toLocaleDateString('id-ID')}</td>
                  <td>
                    <button className="secondary" onClick={() => setSelected(app)}>Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.publicName}</h2>
            <div className="detail-panel">
              <div><strong>Email:</strong> {selected.user.email}</div>
              <div><strong>Status:</strong> {statusBadge(selected.status)}</div>
              {selected.madhhab && <div><strong>Madzhab:</strong> {selected.madhhab}</div>}
              {selected.bio && <div><strong>Bio:</strong> {selected.bio}</div>}
              {selected.credentials && <div><strong>Referensi:</strong> {selected.credentials}</div>}
              {selected.specialties.length > 0 && (
                <div><strong>Keahlian:</strong> {selected.specialties.join(', ')}</div>
              )}
              {selected.credentialFiles.length > 0 && (
                <div>
                  <strong>Berkas:</strong>{' '}
                  {selected.credentialFiles.map((f) => (
                    <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8 }}>
                      {f.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {selected.status === 'PENDING' && (
              <div className="modal-actions">
                <button className="danger" disabled={working} onClick={() => reject(selected)}>
                  Tolak
                </button>
                <button disabled={working} onClick={() => approve(selected)}>
                  Setujui
                </button>
              </div>
            )}
            {selected.status !== 'PENDING' && (
              <div className="modal-actions">
                <button className="secondary" onClick={() => setSelected(null)}>Tutup</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
