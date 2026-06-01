import { useEffect, useState } from 'react';
import { api, type SensitiveRule } from '../api';

const EMPTY_FORM = { topic: '', pattern: '', scope: 'GLOBAL' as const, isActive: true };

export function SensitiveRulesPage() {
  const [data, setData] = useState<SensitiveRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SensitiveRule | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setData(await api.listSensitiveRules());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(rule: SensitiveRule) {
    setEditing(rule);
    setForm({ topic: rule.topic, pattern: rule.pattern ?? '', scope: rule.scope, isActive: rule.isActive });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.topic.trim()) { alert('Topic wajib diisi.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, pattern: form.pattern || undefined };
      if (editing) {
        await api.updateSensitiveRule(editing.id, payload);
      } else {
        await api.createSensitiveRule(payload);
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Sensitive Rules</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={load}>Refresh</button>
          <button onClick={openNew}>+ Tambah Rule</button>
        </div>
      </div>

      {loading && <p className="empty">Memuat...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Pattern</th>
                <th>Scope</th>
                <th>Ustadz</th>
                <th>Aktif</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={6} className="empty">Tidak ada rule.</td></tr>
              )}
              {data.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.topic}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.pattern ?? '—'}</td>
                  <td>
                    <span className={`badge ${r.scope === 'GLOBAL' ? 'badge-green' : 'badge-yellow'}`}>
                      {r.scope}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted)' }}>{r.ustadz?.publicName ?? '—'}</td>
                  <td>
                    <span className={`badge ${r.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {r.isActive ? 'Ya' : 'Tidak'}
                    </span>
                  </td>
                  <td>
                    <button className="secondary" onClick={() => openEdit(r)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Rule' : 'Tambah Rule'}</h2>

            <div className="form-row">
              <label>Topic *</label>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Pattern (regex/keyword, opsional)</label>
              <input value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Scope</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value as 'GLOBAL' | 'USTADZ' })}
              >
                <option value="GLOBAL">GLOBAL</option>
                <option value="USTADZ">USTADZ</option>
              </select>
            </div>
            <div className="form-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <label htmlFor="isActive" style={{ color: 'var(--ink)' }}>Aktif</label>
            </div>

            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button disabled={saving} onClick={handleSave}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
