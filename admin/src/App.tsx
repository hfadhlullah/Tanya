import { useState, useEffect } from 'react';
import { AUTH_EXPIRED_EVENT } from './api';
import { LoginGate } from './pages/LoginGate';
import { UstadzApplicationsPage } from './pages/UstadzApplicationsPage';
import { SensitiveRulesPage } from './pages/SensitiveRulesPage';
import { CorpusSourcesPage } from './pages/CorpusSourcesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import './App.css';

type Tab = 'ustadz' | 'rules' | 'corpus' | 'audit';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>('ustadz');

  useEffect(() => {
    if (localStorage.getItem('tanya_admin_key')) setAuthed(true);
  }, []);

  useEffect(() => {
    function handleAuthExpired() {
      setAuthed(false);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

  if (!authed) return <LoginGate onLogin={() => setAuthed(true)} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ustadz', label: 'Ustadz Applications' },
    { id: 'rules', label: 'Sensitive Rules' },
    { id: 'corpus', label: 'Corpus Sources' },
    { id: 'audit', label: 'Audit Logs' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Tanya Admin</div>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button
          className="secondary logout"
          onClick={() => {
            localStorage.removeItem('tanya_admin_key');
            setAuthed(false);
          }}
        >
          Keluar
        </button>
      </aside>
      <main className="content">
        {tab === 'ustadz' && <UstadzApplicationsPage />}
        {tab === 'rules' && <SensitiveRulesPage />}
        {tab === 'corpus' && <CorpusSourcesPage />}
        {tab === 'audit' && <AuditLogsPage />}
      </main>
    </div>
  );
}
