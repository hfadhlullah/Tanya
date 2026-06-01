import { useEffect, useState } from 'react';
import { api, type CorpusSource } from '../api';

export function CorpusSourcesPage() {
  const [data, setData] = useState<CorpusSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setData(await api.listCorpusSources());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Corpus Sources</h1>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>

      {loading && <p className="empty">Memuat...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Judul</th>
                <th>Penulis</th>
                <th>Bahasa</th>
                <th>Chunks</th>
                <th>Dikutip</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={6} className="empty">Tidak ada sumber.</td></tr>
              )}
              {data.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.title}</td>
                  <td style={{ color: 'var(--muted)' }}>{s.author ?? '—'}</td>
                  <td>
                    <span className="badge badge-gray">{s.language.toUpperCase()}</span>
                  </td>
                  <td>{s._count.corpusChunks.toLocaleString()}</td>
                  <td>{s._count.citations.toLocaleString()}</td>
                  <td style={{ color: 'var(--muted)' }}>
                    {new Date(s.createdAt).toLocaleDateString('id-ID')}
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
