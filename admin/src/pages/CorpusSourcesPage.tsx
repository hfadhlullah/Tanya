import { useEffect, useState, type FormEvent } from 'react';
import { api, type CorpusSource } from '../api';

export function CorpusSourcesPage() {
  const [data, setData] = useState<CorpusSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');
  const [form, setForm] = useState({
    type: 'QURAN' as 'QURAN' | 'HADITH',
    title: '',
    reference: '',
    license: 'approved',
    language: 'id' as 'id',
  });
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setError('');
      setData(await api.listCorpusSources());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setError('Pilih satu atau banyak file JSON/CSV terlebih dahulu.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setResult('');
      const response = await api.importCorpus({ ...form, files });
      setResult(
        `${response.importSummary.chunksCreated} chunk dibuat dari ${response.importSummary.recordsReceived} record (${response.importSummary.fileName}).`,
      );
      setForm({ type: 'QURAN', title: '', reference: '', license: 'approved', language: 'id' });
      setFiles([]);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
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
      {result && <p className="detail-panel">{result}</p>}

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <form onSubmit={submitImport} style={{ display: 'grid', gap: 12 }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h2 style={{ fontSize: 16 }}>Import Corpus</h2>
            <button className="secondary" type="submit" disabled={submitting}>
              {submitting ? 'Mengimpor...' : 'Import'}
            </button>
          </div>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <label className="form-row">
              <span>Tipe</span>
              <select value={form.type} onChange={(e) => setForm((v) => ({ ...v, type: e.target.value as 'QURAN' | 'HADITH' }))}>
                <option value="QURAN">Qur'an</option>
                <option value="HADITH">Hadith</option>
              </select>
            </label>
            <label className="form-row">
              <span>Judul</span>
              <input value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} placeholder="Contoh: Terjemah Kemenag" required />
            </label>
            <label className="form-row">
              <span>Referensi</span>
              <input value={form.reference} onChange={(e) => setForm((v) => ({ ...v, reference: e.target.value }))} placeholder="Contoh: QS / Shahih Bukhari" />
            </label>
            <label className="form-row">
              <span>Lisensi</span>
              <input value={form.license} onChange={(e) => setForm((v) => ({ ...v, license: e.target.value }))} required />
            </label>
          </div>
          <label className="form-row">
            <span>File JSON / CSV</span>
            <input type="file" multiple accept=".json,.csv,application/json,text/csv" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} required />
          </label>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Qur'an perlu field `surah`, `ayah`, `text`. Hadith perlu field `collection`, `number`, `text`. Banyak file JSON juga didukung dalam satu import.
          </p>
          {files.length > 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
              {files.length} file dipilih: {files.slice(0, 5).map((file) => file.name).join(', ')}{files.length > 5 ? ', ...' : ''}
            </p>
          )}
        </form>
      </div>

      {!loading && !error && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Tipe</th>
                <th>Judul</th>
                <th>Referensi</th>
                <th>Lisensi</th>
                <th>Bahasa</th>
                <th>Chunks</th>
                <th>Dikutip</th>
                <th>Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={8} className="empty">Tidak ada sumber.</td></tr>
              )}
              {data.map((s) => (
                <tr key={s.id}>
                  <td><span className="badge badge-gray">{s.type}</span></td>
                  <td style={{ fontWeight: 600 }}>{s.title}</td>
                  <td style={{ color: 'var(--muted)' }}>{s.reference ?? '—'}</td>
                  <td style={{ color: 'var(--muted)' }}>{s.license ?? '—'}</td>
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
