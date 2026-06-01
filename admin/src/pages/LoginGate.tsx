import { useState } from 'react';

interface Props {
  onLogin: () => void;
}

export function LoginGate({ onLogin }: Props) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) { setError('Masukkan admin key.'); return; }
    localStorage.setItem('tanya_admin_key', key.trim());
    onLogin();
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: 'var(--white)',
          padding: 32,
          borderRadius: 16,
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: 320,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--emerald-dark)' }}>Tanya Admin</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Demo Admin Key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="••••••••"
            autoFocus
          />
        </div>
        {error && <p style={{ color: 'var(--danger-text)', fontSize: 12 }}>{error}</p>}
        <button type="submit">Masuk</button>
      </form>
    </div>
  );
}
