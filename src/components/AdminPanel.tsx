import { useState } from 'react';
import { CalendarOff, CheckCircle2, Clock, ExternalLink, LockOpen, Mail, Search, Settings, Trash2, XCircle } from 'lucide-react';
import { daysBetweenISO, formatDateIT, MONTHS_IT, pad } from '../lib/dates';
import type { AppSettings, Booking, BookingStatus, EmailLog, GlobalClosure } from '../types';

type BookingFilter = 'all' | 'da_verificare' | 'attesa' | 'confermate' | 'disdette';

function getNextMonthKey(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}`;
}

function formatMonthIT(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return `${MONTHS_IT[m - 1]} ${y}`;
}

interface AdminPanelProps {
  bookings: Booking[];
  closures: GlobalClosure[];
  settings: AppSettings;
  emailLogs: EmailLog[];
  onApprove: (bookingId: string) => void;
  onReject: (bookingId: string) => void;
  onSimulateDayPass: () => void;
  onAddClosure: (startDate: string, endDate: string, motivo: string) => void;
  onRemoveClosure: (id: string) => void;
  onSaveSettings: (next: AppSettings) => void;
}

const STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  in_attesa_pagamento: { label: 'In attesa pagamento', cls: 'badge-warning' },
  prova_caricata: { label: 'Ricevuta da verificare', cls: 'badge-primary' },
  confermata: { label: 'Confermata', cls: 'badge-success' },
  scaduta: { label: 'Scaduta (Sbloccata)', cls: 'badge-danger' },
  annullata: { label: 'Disdetta / Annullata', cls: 'badge-muted' },
};

export function AdminPanel({
  bookings,
  closures,
  settings,
  emailLogs,
  onApprove,
  onReject,
  onSimulateDayPass,
  onAddClosure,
  onRemoveClosure,
  onSaveSettings,
}: AdminPanelProps) {
  const [tab, setTab] = useState<'bookings' | 'closures' | 'settings'>('bookings');
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [monthToUnlock, setMonthToUnlock] = useState(getNextMonthKey);
  const [startDate, setStartDate] = useState('2026-12-01');
  const [endDate, setEndDate] = useState('2026-12-05');
  const [motivo, setMotivo] = useState('');

  const [p2, setP2] = useState(settings.packages[2].price);
  const [p3, setP3] = useState(settings.packages[3].price);
  const [p4, setP4] = useState(settings.packages[4].price);
  const [remX, setRemX] = useState(settings.reminderDaysX);
  const [expY, setExpY] = useState(settings.expireExtraDaysY);

  function handleUnlockMonth(e: React.FormEvent) {
    e.preventDefault();
    if (!monthToUnlock) return;
    if (settings.unlockedMonths.includes(monthToUnlock)) return;
    const nextMonths = [...settings.unlockedMonths, monthToUnlock].sort();
    onSaveSettings({ ...settings, unlockedMonths: nextMonths });
  }

  function handleLockMonth(key: string) {
    const nextMonths = settings.unlockedMonths.filter((m) => m !== key);
    onSaveSettings({ ...settings, unlockedMonths: nextMonths });
  }

  function submitClosure(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) return;
    const safeEnd = !endDate || endDate < startDate ? startDate : endDate;
    onAddClosure(startDate, safeEnd, motivo.trim() || 'Pesca interdetta');
    setMotivo('');
  }

  function submitSettings(e: React.FormEvent) {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      packages: {
        2: { ...settings.packages[2], price: Number(p2) || 27 },
        3: { ...settings.packages[3], price: Number(p3) || 40 },
        4: { ...settings.packages[4], price: Number(p4) || 55 },
      },
      reminderDaysX: Number(remX) || 2,
      expireExtraDaysY: Number(expY) || 2,
    });
  }

  return (
    <div className="stack-md">
      <div className="row-gap">
        <button
          type="button"
          className={`btn btn-sm ${tab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('bookings')}
        >
          Prenotazioni &amp; Bonifici
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'closures' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('closures')}
        >
          <CalendarOff size={14} /> Mesi Aperti &amp; Chiusure
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('settings')}
        >
          <Settings size={14} /> Listino &amp; Scadenze
        </button>
      </div>

      {tab === 'bookings' && (() => {
        const counts = {
          all: bookings.length,
          da_verificare: bookings.filter((b) => b.status === 'prova_caricata').length,
          attesa: bookings.filter((b) => b.status === 'in_attesa_pagamento').length,
          confermate: bookings.filter((b) => b.status === 'confermata').length,
          disdette: bookings.filter((b) => b.status === 'annullata' || b.status === 'scaduta').length,
        };

        const q = searchQuery.trim().toLowerCase();
        const filtered = bookings.filter((b) => {
          if (bookingFilter === 'da_verificare' && b.status !== 'prova_caricata') return false;
          if (bookingFilter === 'attesa' && b.status !== 'in_attesa_pagamento') return false;
          if (bookingFilter === 'confermate' && b.status !== 'confermata') return false;
          if (bookingFilter === 'disdette' && b.status !== 'annullata' && b.status !== 'scaduta') return false;
          if (q) {
            const hay = `${b.id} ${b.pegId} ${b.userName} ${b.userEmail} ${b.causale}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });

        const filterPills: Array<{ id: BookingFilter; label: string; count: number }> = [
          { id: 'all', label: 'Tutte', count: counts.all },
          { id: 'da_verificare', label: 'Da verificare', count: counts.da_verificare },
          { id: 'attesa', label: 'In attesa pagamento', count: counts.attesa },
          { id: 'confermate', label: 'Confermate', count: counts.confermate },
          { id: 'disdette', label: 'Disdette / Scadute', count: counts.disdette },
        ];

        return (
          <div className="stack-md">
            <div className="card card-pad row-between">
              <div>
                <h2 style={{ margin: 0, fontSize: 16 }}>Prenotazioni &amp; Conferma Bonifici</h2>
                <p className="text-xs text-muted" style={{ margin: '4px 0 0' }}>
                  Sollecito automatico dopo <strong>{settings.reminderDaysX} gg</strong> senza ricevuta; sblocco automatico della piazzola dopo{' '}
                  <strong>{settings.reminderDaysX + settings.expireExtraDaysY} gg</strong> totali.
                </p>
              </div>
              <button type="button" className="btn btn-warning btn-sm" onClick={onSimulateDayPass}>
                <Clock size={14} /> Simula +1 Giorno (Solleciti e Scadenze)
              </button>
            </div>

            {/* Filtri stato + Ricerca */}
            <div className="card card-pad stack-sm">
              <div className="row-gap">
                {filterPills.map((fp) => (
                  <button
                    key={fp.id}
                    type="button"
                    className={`btn btn-sm ${bookingFilter === fp.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setBookingFilter(fp.id)}
                  >
                    {fp.label}{' '}
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 999,
                        fontSize: 11,
                        background: bookingFilter === fp.id ? 'rgba(255,255,255,0.22)' : 'var(--surface-muted)',
                      }}
                    >
                      {fp.count}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }}
                />
                <input
                  className="input"
                  style={{ paddingLeft: 34 }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca per nome, email, piazzola (es. 1R, 3) o codice #b..."
                />
              </div>
            </div>

            <div className="stack-sm">
              {filtered.length === 0 ? (
                <div className="card card-pad text-sm text-muted">
                  Nessuna prenotazione trovata con i filtri selezionati.
                </div>
              ) : (
                filtered.map((b) => {
                  const meta = STATUS_META[b.status];
                  return (
                    <div key={b.id} className="card card-pad row-between">
                      <div className="stack-sm" style={{ gap: 4 }}>
                        <div className="row-gap">
                          <strong style={{ fontSize: 14 }}>
                            #{b.id} — Piazzola {b.pegId}
                          </strong>
                          <span className={`badge ${meta.cls}`}>{meta.label}</span>
                        </div>
                        <div className="text-xs text-muted">
                          {b.userName} ({b.userEmail}) • {formatDateIT(b.dates[0])} →{' '}
                          {formatDateIT(b.dates[b.dates.length - 1])} • <strong>€{b.total.toFixed(2)}</strong>
                        </div>
                        <div className="font-mono text-xs text-muted">{b.causale}</div>
                        {b.proofFile && (
                          <div className="text-xs">
                            Ricevuta: <strong>{b.proofFile}</strong>{' '}
                            {b.proofUrl && (
                              <a href={b.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                Apri file <ExternalLink size={11} style={{ verticalAlign: -1 }} />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {b.status === 'prova_caricata' && (
                        <div className="row-gap">
                          <button type="button" className="btn btn-success btn-sm" onClick={() => onApprove(b.id)}>
                            <CheckCircle2 size={14} /> Conferma
                          </button>
                          <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => onReject(b.id)}>
                            <XCircle size={14} /> Rifiuta
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <details className="card card-pad">
              <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={15} color="var(--primary)" />
                Log Email Automatiche ({emailLogs.length})
              </summary>
              <div className="stack-sm" style={{ maxHeight: 220, overflowY: 'auto', gap: 6, marginTop: 12 }}>
                {emailLogs.map((l) => (
                  <div key={l.id} className="text-xs" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                    <span className="text-muted">[{l.time}]</span>{' '}
                    <span className="font-mono" style={{ color: 'var(--primary)' }}>{l.to}</span> — {l.subject}
                  </div>
                ))}
              </div>
            </details>
          </div>
        );
      })()}

      {tab === 'closures' && (
        <div className="stack-md">
          <div className="grid-2">
            <div className="card card-pad stack-sm">
              <div className="row-gap">
                <LockOpen size={16} color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: 16 }}>Mesi Sbloccati alle Prenotazioni</h2>
              </div>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                Di default il calendario è <strong>tutto bloccato</strong>. Solo i mesi elencati qui sono prenotabili.
              </p>
              {settings.unlockedMonths.length === 0 ? (
                <div className="text-xs text-muted" style={{ padding: '8px 0' }}>
                  Nessun mese sbloccato: tutte le date risultano bloccate agli utenti.
                </div>
              ) : (
                settings.unlockedMonths.map((key) => (
                  <div
                    key={key}
                    className="row-between"
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      background: 'var(--primary-soft)',
                      border: '1px solid #99d5ce',
                    }}
                  >
                    <strong style={{ fontSize: 13, color: 'var(--primary)' }}>{formatMonthIT(key)}</strong>
                    <button
                      type="button"
                      className="btn btn-danger-outline btn-sm"
                      onClick={() => handleLockMonth(key)}
                    >
                      Blocca
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleUnlockMonth} className="card card-pad stack-sm" style={{ height: 'fit-content' }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Sblocca un Mese</h2>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                Preimpostato sul mese successivo all&apos;attuale.
              </p>
              <div className="field">
                <label>Mese da sbloccare *</label>
                <input
                  className="input"
                  type="month"
                  required
                  value={monthToUnlock}
                  onChange={(e) => setMonthToUnlock(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={!monthToUnlock || settings.unlockedMonths.includes(monthToUnlock)}
              >
                <LockOpen size={14} />{' '}
                {settings.unlockedMonths.includes(monthToUnlock)
                  ? `${formatMonthIT(monthToUnlock)} già sbloccato`
                  : `Sblocca ${formatMonthIT(monthToUnlock)}`}
              </button>
            </form>
          </div>

          <div className="grid-2">
            <div className="card card-pad stack-sm">
              <h2 style={{ margin: 0, fontSize: 16 }}>Chiusure Globali (Pesca Interdetta)</h2>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                Valide automaticamente su <strong>tutte le 20 piazzole</strong>.
              </p>
              {closures.map((c) => (
                <div
                  key={c.id}
                  className="row-between"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: 'var(--surface-muted)',
                    border: '1px solid #fcd34d',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {c.startDate === c.endDate
                        ? `${formatDateIT(c.startDate)} (Giorno singolo)`
                        : `Dal ${formatDateIT(c.startDate)} al ${formatDateIT(c.endDate)} (${daysBetweenISO(c.startDate, c.endDate) + 1} gg)`}
                    </div>
                    <div className="text-xs text-muted">{c.motivo}</div>
                  </div>
                  <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => onRemoveClosure(c.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={submitClosure} className="card card-pad stack-sm" style={{ height: 'fit-content' }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Aggiungi Chiusura Globale</h2>
              <div className="grid-2">
                <div className="field">
                  <label>Dal (Data inizio) *</label>
                  <input className="input" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Al (opzionale per 1 gg)</label>
                  <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Motivo</label>
                <input
                  className="input"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Es. Fermo biologico, Gara sociale"
                />
              </div>
              <button type="submit" className="btn btn-warning btn-full">
                Blocca su Tutti i Calendari
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <form onSubmit={submitSettings} className="card card-pad stack-md" style={{ maxWidth: 580 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>Listino Pacchetti &amp; Scadenze Pagamento</h2>
            <p className="text-xs text-muted" style={{ margin: '4px 0 0' }}>
              Imposta le tariffe standard e le tempistiche automatiche per i bonifici non ancora caricati.
            </p>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>2 gg / 1 notte (€)</label>
              <input className="input" type="number" value={p2} onChange={(e) => setP2(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>3 gg / 2 notti (€)</label>
              <input className="input" type="number" value={p3} onChange={(e) => setP3(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>4 gg / 3 notti (€)</label>
              <input className="input" type="number" value={p4} onChange={(e) => setP4(Number(e.target.value))} />
            </div>
          </div>
          <div className="stack-sm" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <strong style={{ fontSize: 13.5 }}>Gestione automatica mancato pagamento</strong>
            <div className="grid-2">
              <div className="field">
                <label>Giorni prima del sollecito email</label>
                <input className="input" type="number" min={1} value={remX} onChange={(e) => setRemX(Number(e.target.value))} />
                <span className="text-xs text-muted">
                  Dopo quanti giorni dalla prenotazione inviare il promemoria se l&apos;utente non ha ancora caricato la ricevuta.
                </span>
              </div>
              <div className="field">
                <label>Giorni extra dopo il sollecito prima dello sblocco</label>
                <input className="input" type="number" min={1} value={expY} onChange={(e) => setExpY(Number(e.target.value))} />
                <span className="text-xs text-muted">
                  Giorni concessi dopo il sollecito prima di annullare la prenotazione e liberare la piazzola (totale: <strong>{Number(remX) + Number(expY)} gg</strong>).
                </span>
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Salva Impostazioni
          </button>
        </form>
      )}
    </div>
  );
}
