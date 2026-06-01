import { useEffect, useState } from 'react';
import { api, type CreateUstadzPayload, type UstadzApplication } from '../api';

export function UstadzApplicationsPage() {
  const [data, setData] = useState<UstadzApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<UstadzApplication | null>(null);
  const [working, setWorking] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateUstadzPayload>({
    email: '', password: '', publicName: '', bio: '', credentials: '',
    publicProfile: '', specialties: [], madhhab: '',
  });
  const [specialtiesRaw, setSpecialtiesRaw] = useState('');

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

  async function handleCreate() {
    const specialties = specialtiesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    setWorking(true);
    try {
      await api.createUstadz({ ...form, specialties });
      setShowCreate(false);
      setForm({ email: '', password: '', publicName: '', bio: '', credentials: '', publicProfile: '', specialties: [], madhhab: '' });
      setSpecialtiesRaw('');
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCreate(true)}>+ Tambah Ustadz</button>
          <button className="secondary" onClick={load}>Refresh</button>
        </div>
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

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah Ustadz</h2>
            <div className="detail-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(
                [
                  { label: 'Email *', key: 'email', type: 'email', placeholder: 'ustadz@email.com' },
                  { label: 'Password * (min 8 karakter)', key: 'password', type: 'password', placeholder: '••••••••' },
                  { label: 'Nama Publik *', key: 'publicName', type: 'text', placeholder: 'Nama yang ditampilkan' },
                  { label: 'Madzhab', key: 'madhhab', type: 'text', placeholder: "cth: Syafi'i" },
                  { label: 'Link Profil', key: 'publicProfile', type: 'text', placeholder: 'https://...' },
                ] as { label: string; key: keyof CreateUstadzPayload; type: string; placeholder: string }[]
              ).map(({ label, key, type, placeholder }) => (
                <label key={key}>
                  <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>{label}</div>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(form[key] as string) ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </label>
              ))}
              <label>
                <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Bidang Keahlian (pisah koma)</div>
                <input
                  type="text"
                  placeholder="cth: fiqh, akidah, tafsir"
                  value={specialtiesRaw}
                  onChange={(e) => setSpecialtiesRaw(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </label>
              <label>
                <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Bio</div>
                <textarea
                  placeholder="Latar belakang singkat"
                  value={form.bio ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </label>
              <label>
                <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Referensi / Ijazah</div>
                <textarea
                  placeholder="Lembaga pendidikan atau referensi"
                  value={form.credentials ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, credentials: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowCreate(false)}>Batal</button>
              <button disabled={working} onClick={handleCreate}>
                {working ? 'Menyimpan...' : 'Buat Akun Ustadz'}
              </button>
            </div>
          </div>
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
