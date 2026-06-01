import { useEffect, useState } from 'react';
import { api, type UstadzApplication } from '../api';

interface ProfileForm {
  publicName: string;
  bio: string;
  credentials: string;
  publicProfile: string;
  specialtiesRaw: string;
  madhhab: string;
}

function emptyProfileForm(app?: UstadzApplication | null): ProfileForm {
  return {
    publicName: app?.publicName ?? '',
    bio: app?.bio ?? '',
    credentials: app?.credentials ?? '',
    publicProfile: app?.publicProfile ?? '',
    specialtiesRaw: app?.specialties.join(', ') ?? '',
    madhhab: app?.madhhab ?? '',
  };
}

export function UstadzApplicationsPage() {
  const [data, setData] = useState<UstadzApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<UstadzApplication | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm());
  const [working, setWorking] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', publicName: '' });

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

  function openDetail(app: UstadzApplication) {
    setSelected(app);
    setProfileForm(emptyProfileForm(app));
  }

  async function handleApprove() {
    if (!selected) return;
    const specialties = profileForm.specialtiesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    setWorking(true);
    try {
      await api.approveUstadzWithProfile(selected.id, {
        publicName: profileForm.publicName,
        bio: profileForm.bio,
        credentials: profileForm.credentials,
        publicProfile: profileForm.publicProfile,
        specialties,
        madhhab: profileForm.madhhab,
      });
      setSelected(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleCreate() {
    setWorking(true);
    try {
      await api.createUstadz(createForm);
      setShowCreate(false);
      setCreateForm({ email: '', password: '', publicName: '' });
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

  async function deactivate(app: UstadzApplication) {
    if (!confirm(`Nonaktifkan ${app.publicName}?`)) return;
    setWorking(true);
    try {
      await api.deactivateUstadz(app.id);
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

  const pf = profileForm;
  const setPf = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProfileForm((f) => ({ ...f, [key]: e.target.value }));

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
                  <td>{app.specialties.join(', ') || '-'}</td>
                  <td>{statusBadge(app.status)}</td>
                  <td style={{ color: 'var(--muted)' }}>{new Date(app.createdAt).toLocaleDateString('id-ID')}</td>
                  <td>
                    <button className="secondary" onClick={() => openDetail(app)}>Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal - minimal fields only */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Tambah Ustadz</h2>
            <div className="detail-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([
                { label: 'Email *', key: 'email' as const, type: 'email', placeholder: 'ustadz@email.com' },
                { label: 'Password * (min 8 karakter)', key: 'password' as const, type: 'password', placeholder: '••••••••' },
                { label: 'Nama Publik *', key: 'publicName' as const, type: 'text', placeholder: 'Nama yang ditampilkan' },
              ]).map(({ label, key, type, placeholder }) => (
                <label key={key}>
                  <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>{label}</div>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={createForm[key]}
                    onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowCreate(false)}>Batal</button>
              <button disabled={working} onClick={handleCreate}>
                {working ? 'Menyimpan...' : 'Buat Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal - full profile form for PENDING */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.publicName}</h2>
            <div className="detail-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div><strong>Email:</strong> {selected.user.email}</div>
                <div><strong>Status:</strong> {statusBadge(selected.status)}</div>
              </div>

              {selected.status === 'PENDING' || selected.status === 'REJECTED' ? (
                <>
                  {([
                    { label: 'Nama Publik *', key: 'publicName' as const, type: 'input', placeholder: 'Nama yang ditampilkan' },
                    { label: 'Madzhab', key: 'madhhab' as const, type: 'input', placeholder: "cth: Syafi'i" },
                    { label: 'Link Profil', key: 'publicProfile' as const, type: 'input', placeholder: 'https://...' },
                    { label: 'Bidang Keahlian (pisah koma)', key: 'specialtiesRaw' as const, type: 'input', placeholder: 'cth: fiqh, akidah, tafsir' },
                  ]).map(({ label, key, placeholder }) => (
                    <label key={key}>
                      <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>{label}</div>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={pf[key]}
                        onChange={setPf(key)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    </label>
                  ))}
                  <label>
                    <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Bio</div>
                    <textarea rows={3} placeholder="Latar belakang singkat" value={pf.bio} onChange={setPf('bio')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </label>
                  <label>
                    <div style={{ fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Referensi / Ijazah</div>
                    <textarea rows={3} placeholder="Lembaga pendidikan atau referensi" value={pf.credentials} onChange={setPf('credentials')} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </label>
                </>
              ) : (
                <>
                  {selected.madhhab && <div><strong>Madzhab:</strong> {selected.madhhab}</div>}
                  {selected.bio && <div><strong>Bio:</strong> {selected.bio}</div>}
                  {selected.credentials && <div><strong>Referensi:</strong> {selected.credentials}</div>}
                  {selected.specialties.length > 0 && <div><strong>Keahlian:</strong> {selected.specialties.join(', ')}</div>}
                  {selected.credentialFiles.length > 0 && (
                    <div>
                      <strong>Berkas:</strong>{' '}
                      {selected.credentialFiles.map((f) => (
                        <a key={f.id} href={f.fileUrl} target="_blank" rel="noopener noreferrer" style={{ marginRight: 8 }}>{f.label}</a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {(selected.status === 'PENDING' || selected.status === 'REJECTED') && (
              <div className="modal-actions">
                <button className="danger" disabled={working} onClick={() => reject(selected)}>Tolak</button>
                <button disabled={working} onClick={handleApprove}>
                  {working ? 'Menyimpan...' : 'Setujui & Aktifkan'}
                </button>
              </div>
            )}
            {selected.status === 'APPROVED' && (
              <div className="modal-actions">
                <button className="secondary" onClick={() => setSelected(null)}>Tutup</button>
                <button className="danger" disabled={working} onClick={() => deactivate(selected)}>
                  Nonaktifkan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
