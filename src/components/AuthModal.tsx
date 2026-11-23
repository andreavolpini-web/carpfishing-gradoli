import { useState } from 'react';
import { Lock, Mail, Phone, User, X } from 'lucide-react';
import { store } from '../lib/store';
import type { UserProfile } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [residenteVT, setResidenteVT] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await store.login(email, password)
          : await store.register({ nome, cognome, email, telefono, password, residenteVT });

      if (res.error || !res.user) {
        setError(res.error || 'Impossibile completare l’operazione.');
      } else {
        onSuccess(res.user);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    setLoading(true);
    try {
      const res = await store.loginWithOAuth(provider);
      if (res.error) {
        setError(res.error);
      } else if (res.user) {
        onSuccess(res.user);
      }
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(type: 'user' | 'admin') {
    setMode('login');
    if (type === 'admin') {
      setEmail('admin@carpfishingradoli.it');
      setPassword('admin123');
    } else {
      setEmail('marco.rossi@email.it');
      setPassword('password123');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card stack-md" onClick={(e) => e.stopPropagation()}>
        <div className="row-between">
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
              {mode === 'login' ? 'Accedi al tuo account' : 'Crea account pescatore'}
            </h2>
            <p className="text-xs text-muted" style={{ margin: '4px 0 0' }}>
              {store.isCloud
                ? 'Autenticazione protetta via Supabase'
                : 'Modalità Locale attiva — dati salvati sul dispositivo'}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} aria-label="Chiudi">
            <X size={16} />
          </button>
        </div>

        {/* Social / OAuth Login */}
        <div className="stack-sm">
          <button
            type="button"
            className="btn btn-secondary btn-full"
            disabled={loading}
            onClick={() => handleOAuth('google')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4-3.1z"/>
              <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4 3.1c.95-2.84 3.6-4.96 6.72-4.96z"/>
            </svg>
            Continua con Google (Gmail)
          </button>

          <button
            type="button"
            className="btn btn-full"
            style={{ background: '#0f172a', color: '#ffffff' }}
            disabled={loading}
            onClick={() => handleOAuth('apple')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continua con Apple ID
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span className="text-xs text-muted">oppure con email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <div className="grid-2" style={{ gap: 8 }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Accedi
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setMode('register'); setError(null); }}
          >
            Registrati
          </button>
        </div>

        <form onSubmit={handleSubmit} className="stack-sm">
          {mode === 'register' && (
            <div className="grid-2">
              <div className="field">
                <label>Nome *</label>
                <input className="input" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Marco" />
              </div>
              <div className="field">
                <label>Cognome *</label>
                <input className="input" required value={cognome} onChange={(e) => setCognome(e.target.value)} placeholder="Rossi" />
              </div>
            </div>
          )}

          <div className="field">
            <label><Mail size={12} style={{ verticalAlign: -1 }} /> Email *</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@email.it"
            />
          </div>

          {mode === 'register' && (
            <div className="field">
              <label><Phone size={12} style={{ verticalAlign: -1 }} /> Telefono (WhatsApp) *</label>
              <input
                className="input"
                type="tel"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+39 333 1234567"
              />
            </div>
          )}

          <div className="field">
            <label><Lock size={12} style={{ verticalAlign: -1 }} /> Password *</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caratteri"
            />
          </div>

          {mode === 'register' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '6px 0' }}>
              <input
                type="checkbox"
                checked={residenteVT}
                onChange={(e) => setResidenteVT(e.target.checked)}
              />
              <span>Sono residente nella Provincia di Viterbo (VT)</span>
            </label>
          )}

          {error && (
            <div className="badge badge-danger" style={{ padding: '8px 12px', borderRadius: 10, whiteSpace: 'normal' }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <User size={15} />
            {loading ? 'Attendere...' : mode === 'login' ? 'Accedi' : 'Registrati e inizia'}
          </button>
        </form>

        {!store.isCloud && (
          <div className="card card-pad" style={{ background: 'var(--surface-muted)', padding: 12 }}>
            <div className="text-xs" style={{ fontWeight: 700, marginBottom: 6 }}>
              Account rapidi di test (Modalità Locale):
            </div>
            <div className="row-gap">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fillDemo('user')}>
                Utente (Marco Rossi)
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fillDemo('admin')}>
                Admin (Comune di Gradoli)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
