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
