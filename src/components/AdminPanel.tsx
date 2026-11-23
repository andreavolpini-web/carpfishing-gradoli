import { useState } from 'react';
import { CalendarOff, CheckCircle2, Clock, ExternalLink, Mail, Settings, Trash2, XCircle } from 'lucide-react';
import { daysBetweenISO, formatDateIT } from '../lib/dates';
import type { AppSettings, Booking, BookingStatus, EmailLog, GlobalClosure } from '../types';

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
  const [startDate, setStartDate] = useState('2026-12-01');
  const [endDate, setEndDate] = useState('2026-12-05');
  const [motivo, setMotivo] = useState('');

  const [p2, setP2] = useState(settings.packages[2].price);
  const [p3, setP3] = useState(settings.packages[3].price);
  const [p4, setP4] = useState(settings.packages[4].price);
  const [remX, setRemX] = useState(settings.reminderDaysX);
  const [expY, setExpY] = useState(settings.expireExtraDaysY);

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
          <CalendarOff size={14} /> Chiusure Globali
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('settings')}
        >
          <Settings size={14} /> Listino &amp; Regole X/Y
        </button>
      </div>

      {tab === 'bookings' && (
        <div className="stack-md">
          <div className="card card-pad row-between">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>Prenotazioni &amp; Conferma Bonifici</h2>
              <p className="text-xs text-muted" style={{ margin: '4px 0 0' }}>
                Sollecito dopo <strong>{settings.reminderDaysX} gg</strong>, sblocco automatico dopo{' '}
                <strong>{settings.reminderDaysX + settings.expireExtraDaysY} gg</strong>.
              </p>
            </div>
            <button type="button" className="btn btn-warning btn-sm" onClick={onSimulateDayPass}>
              <Clock size={14} /> Simula +1 Giorno (Cron X / X+Y)
            </button>
          </div>

          <div className="stack-sm">
            {bookings.map((b) => {
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
            })}
          </div>

          <div className="card card-pad stack-sm">
            <div className="row-gap">
              <Mail size={15} color="var(--primary)" />
              <strong style={{ fontSize: 14 }}>Log Email Automatiche</strong>
            </div>
            <div className="stack-sm" style={{ maxHeight: 200, overflowY: 'auto', gap: 6 }}>
              {emailLogs.map((l) => (
                <div key={l.id} className="text-xs" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                  <span className="text-muted">[{l.time}]</span>{' '}
                  <span className="font-mono" style={{ color: 'var(--primary)' }}>{l.to}</span> — {l.subject}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'closures' && (
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
      )}

      {tab === 'settings' && (
        <form onSubmit={submitSettings} className="card card-pad stack-md" style={{ maxWidth: 540 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Listino Pacchetti &amp; Regole X/Y</h2>
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
          <div className="grid-2">
            <div className="field">
              <label>Sollecito dopo (X gg)</label>
              <input className="input" type="number" value={remX} onChange={(e) => setRemX(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Extra prima sblocco (Y gg)</label>
              <input className="input" type="number" value={expY} onChange={(e) => setExpY(Number(e.target.value))} />
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
