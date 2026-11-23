import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
  Upload,
  User,
} from 'lucide-react';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { CalendarPicker } from './components/CalendarPicker';
import { DEFAULT_SETTINGS, PEGS } from './data/pegs';
import {
  buildCausale,
  buildDateRange,
  calculatePrice,
  formatDateIT,
  getRefundPolicy,
} from './lib/dates';
import { store } from './lib/store';
import type {
  AppSettings,
  Booking,
  BookingStatus,
  DurationDays,
  EmailLog,
  GlobalClosure,
  Peg,
  UserProfile,
} from './types';

type TabId = 'pegs' | 'bookings' | 'rules' | 'profile' | 'admin';

const STATUS_BADGE: Record<BookingStatus, { label: string; cls: string }> = {
  in_attesa_pagamento: { label: 'In attesa pagamento', cls: 'badge-warning' },
  prova_caricata: { label: 'Prova caricata (attesa Admin)', cls: 'badge-primary' },
  confermata: { label: 'Confermata', cls: 'badge-success' },
  scaduta: { label: 'Scaduta (Sbloccata)', cls: 'badge-danger' },
  annullata: { label: 'Disdetta / Annullata', cls: 'badge-muted' },
};

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState<TabId>('pegs');
  const [selectedPeg, setSelectedPeg] = useState<Peg | null>(null);
  const [duration, setDuration] = useState<DurationDays>(2);
  const [startDate, setStartDate] = useState<string | null>(null);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [closures, setClosures] = useState<GlobalClosure[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toastTimer = useRef<number | undefined>(undefined);

  function notify(msg: string) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }

  async function refreshAll() {
    const [u, data] = await Promise.all([store.getCurrentUser(), store.loadAll()]);
    setUser(u);
    setBookings(data.bookings);
    setClosures(data.closures);
    setSettings(data.settings);
    setEmailLogs(data.emailLogs);
  }

  useEffect(() => {
    refreshAll();
    const unsubscribe = store.onAuthChange(() => {
      refreshAll();
    });
    return unsubscribe;
  }, []);

  const isResidentVT = Boolean(user?.residenteVT);
  const isAdmin = user?.role === 'admin';
  const pendingAdminCount = bookings.filter((b) => b.status === 'prova_caricata').length;

  function hasConflict(pegId: string, range: string[]): string | null {
    for (const iso of range) {
      const closed = closures.some((c) => iso >= c.startDate && iso <= c.endDate);
      const occupied = bookings.some(
        (b) =>
          b.pegId === pegId &&
          ['in_attesa_pagamento', 'prova_caricata', 'confermata'].includes(b.status) &&
          b.dates.includes(iso),
      );
      if (closed || occupied) return iso;
    }
    return null;
  }

  function handleOpenPeg(peg: Peg) {
    if (peg.residentOnly && !isResidentVT) {
      notify('La Piazzola 1R è riservata ai residenti nella Provincia di Viterbo (VT).');
      return;
    }
    setSelectedPeg(peg);
    setStartDate(null);
    setDuration(2);
  }

  function handleSelectDuration(d: DurationDays) {
    setDuration(d);
    if (startDate && selectedPeg) {
      const conflict = hasConflict(selectedPeg.id, buildDateRange(startDate, d));
      if (conflict) {
        notify(`Conflitto sulla data ${formatDateIT(conflict)}: scegli un'altra data di arrivo.`);
        setStartDate(null);
      }
    }
  }

  function handleSelectStartDate(iso: string) {
    if (!selectedPeg) return;
    const conflict = hasConflict(selectedPeg.id, buildDateRange(iso, duration));
    if (conflict) {
      notify(`Impossibile prenotare dal ${formatDateIT(iso)}: il giorno ${formatDateIT(conflict)} è occupato o chiuso.`);
      return;
    }
    setStartDate(iso);
  }

  function handleChangeMonth(delta: number) {
    let m = calMonth + delta;
    let y = calYear;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setCalMonth(m);
    setCalYear(y);
  }

  async function handleCreateBooking() {
    if (!user) {
      setShowAuth(true);
      notify('Accedi o registrati per confermare la prenotazione.');
      return;
    }
    if (!selectedPeg || !startDate) return;
    const dates = buildDateRange(startDate, duration);
    const { finalPrice, hasDiscount } = calculatePrice(selectedPeg, duration, settings, isResidentVT);
    const causale = buildCausale(selectedPeg.numero, dates);
    const newId = 'b' + Math.floor(1000 + Math.random() * 9000);

    const booking: Booking = {
      id: newId,
      pegId: selectedPeg.id,
      userId: user.id,
      userName: `${user.nome} ${user.cognome}`.trim(),
      userEmail: user.email,
      dates,
      duration,
      total: finalPrice,
      discountApplied: hasDiscount,
      causale,
      status: 'in_attesa_pagamento',
      proofFile: null,
      daysElapsed: 0,
      reminderSent: false,
    };

    await store.createBooking(
      booking,
      `Prenotazione #${newId} — €${finalPrice.toFixed(2)} | Causale: ${causale}`,
    );
    await refreshAll();
    setSelectedPeg(null);
    setStartDate(null);
    setTab('bookings');
    notify(`Prenotazione #${newId} registrata! Effettua il bonifico e carica la ricevuta.`);
  }

  async function handleUploadReceipt(booking: Booking, file: File | null) {
    if (!file) return;
    await store.uploadReceipt(
      booking.id,
      file,
      settings.email,
      `Ricevuta caricata per #${booking.id} (${booking.userName}) — €${booking.total.toFixed(2)}`,
    );
    await refreshAll();
    notify(`Ricevuta "${file.name}" caricata per #${booking.id}. In attesa di conferma Admin.`);
  }

  async function handleCancelBooking(booking: Booking) {
    const policy = getRefundPolicy(booking.dates[0]);
    const refundAmt = booking.status === 'confermata' ? (booking.total * policy.pct) / 100 : 0;
    await store.updateBookingStatus(
      booking.id,
      { status: 'annullata' },
      booking.userEmail,
      `Disdetta #${booking.id} confermata — Rimborso previsto: €${refundAmt.toFixed(2)} (${policy.pct}%)`,
    );
    await refreshAll();
    notify(`Prenotazione #${booking.id} disdetta. Rimborso calcolato: €${refundAmt.toFixed(2)} (${policy.pct}%).`);
  }

  async function handleAdminApprove(bookingId: string) {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    await store.updateBookingStatus(
      bookingId,
      { status: 'confermata' },
      b.userEmail,
      `Prenotazione #${bookingId} CONFERMATA! Postazione concessa.`,
    );
    await refreshAll();
    notify(`Prenotazione #${bookingId} confermata!`);
  }

  async function handleAdminReject(bookingId: string) {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    await store.updateBookingStatus(
      bookingId,
      { status: 'in_attesa_pagamento', proofFile: null, proofUrl: null },
      b.userEmail,
      `Ricevuta rifiutata per #${bookingId} — Ricaricare documento leggibile.`,
    );
    await refreshAll();
    notify(`Ricevuta rifiutata per #${bookingId}.`);
  }

  async function handleSimulateDayPass() {
    const X = Number(settings.reminderDaysX);
    const XY = X + Number(settings.expireExtraDaysY);
    let reminders = 0;
    let expired = 0;

    for (const b of bookings) {
      if (b.status === 'in_attesa_pagamento') {
        const nextDays = b.daysElapsed + 1;
        if (nextDays >= XY) {
          expired++;
          await store.updateBookingStatus(
            b.id,
            { status: 'scaduta', daysElapsed: nextDays },
            b.userEmail,
            `Prenotazione #${b.id} SCADUTA e sbloccata automaticamente (oltre ${XY} gg)`,
          );
        } else if (nextDays >= X && !b.reminderSent) {
          reminders++;
          await store.updateBookingStatus(
            b.id,
            { reminderSent: true, daysElapsed: nextDays },
            b.userEmail,
            `SOLLECITO: carica la ricevuta per #${b.id} entro ${XY - nextDays} gg`,
          );
        } else {
          await store.updateBookingStatus(b.id, { daysElapsed: nextDays });
        }
      }
    }
    await refreshAll();
    notify(`Simulato +1 giorno: ${reminders} solleciti inviati, ${expired} prenotazioni sbloccate.`);
  }

  async function handleToggleResidentVT() {
    if (!user) {
      setShowAuth(true);
      return;
    }
    const updated = await store.updateProfile(user.id, { residenteVT: !user.residenteVT });
    if (updated) {
      setUser(updated);
      notify(
        updated.residenteVT
          ? 'Residenza Provincia di Viterbo ATTIVA: Piazzola 1R sbloccata e sconto 50% su 1R, 3, 5, 10, 14!'
          : 'Modalità Non Residente VT: tariffe standard.',
      );
    }
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      notify('Copiato negli appunti!');
      window.setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      notify('Copia manualmente il testo selezionato.');
    }
  }

  const selectedRange = startDate ? buildDateRange(startDate, duration) : [];
  const myBookings = user ? bookings.filter((b) => b.userEmail === user.email) : [];

  const navItems: Array<{ id: TabId; label: string; icon: typeof MapPin; badge?: number }> = [
    { id: 'pegs', label: 'Piazzole', icon: MapPin },
    { id: 'bookings', label: 'Prenotazioni', icon: CalendarDays },
    { id: 'rules', label: 'Regolamento', icon: BookOpen },
    { id: 'profile', label: 'Profilo', icon: User },
    ...(isAdmin ? [{ id: 'admin' as TabId, label: 'Admin', icon: ShieldCheck, badge: pendingAdminCount }] : []),
  ];

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" onClick={() => { setTab('pegs'); setSelectedPeg(null); }} style={{ cursor: 'pointer' }}>
            <div className="brand-mark">CG</div>
            <div>
              <h1 className="brand-title">Carpfishing Gradoli</h1>
              <p className="brand-sub">Lago di Bolsena • {store.isCloud ? 'Cloud' : 'Modalità Locale'}</p>
            </div>
          </div>

          <nav className="desktop-nav" aria-label="Navigazione principale">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-pill ${tab === item.id ? 'active' : ''}`}
                  onClick={() => { setTab(item.id); setSelectedPeg(null); }}
                >
                  <Icon size={15} />
                  {item.label}
                  {item.badge ? <span className="badge badge-warning">{item.badge}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="topbar-actions">
            {user ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  await store.logout();
                  setUser(null);
                  if (tab === 'admin') setTab('pegs');
                  notify('Disconnesso.');
                }}
              >
                <LogOut size={14} /> Esci
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAuth(true)}>
                <LogIn size={14} /> Accedi
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="main-container">
        {tab === 'pegs' && !selectedPeg && (
          <div className="stack-md">
            <div className="card card-pad row-between">
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>20 Postazioni sul Lago di Bolsena</div>
                <div className="text-xs text-muted">
                  Scegli la piazzola, seleziona il pacchetto (2, 3 o 4 giorni) e prenota online.
                </div>
              </div>
              {user ? (
                <span className={`badge ${isResidentVT ? 'badge-success' : 'badge-muted'}`}>
                  {isResidentVT ? 'Residente VT (-50% attivo)' : 'Tariffa Standard'}
                </span>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAuth(true)}>
                  Accedi per prenotare
                </button>
              )}
            </div>

            <div className="peg-grid">
              {PEGS.map((p) => {
                const locked = p.residentOnly && !isResidentVT;
                return (
                  <article
                    key={p.id}
                    className={`card peg-card ${locked ? 'locked' : ''}`}
                    onClick={() => handleOpenPeg(p)}
                  >
                    <div
                      className="peg-media"
                      style={{ background: `linear-gradient(135deg, ${p.color}, #0f172a)` }}
                    >
                      <img
                        src={p.img}
                        alt={p.nome}
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="peg-media-overlay" />
                      <div className="peg-media-top">
                        <span className="gps-chip">GPS: {p.gps}</span>
                        {p.residentOnly ? (
                          <span className="badge badge-warning">Solo VT (-50%)</span>
                        ) : p.residentDiscount ? (
                          <span className="badge badge-success">-50% VT</span>
                        ) : null}
                      </div>
                      <div className="peg-media-bottom">
                        <strong style={{ fontSize: 16 }}>{p.nome}</strong>
                      </div>
                    </div>
                    <div className="card-pad row-between" style={{ padding: '12px 14px' }}>
                      <span className="text-xs text-muted" style={{ flex: 1 }}>{p.note}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                        {locked ? 'Riservata' : 'Prenota →'}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'pegs' && selectedPeg && (
          <div className="stack-md">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ width: 'fit-content' }}
              onClick={() => setSelectedPeg(null)}
            >
              <ArrowLeft size={14} /> Torna alle piazzole
            </button>

            <div className="booking-layout">
              <div className="stack-md">
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div
                    className="peg-media"
                    style={{ height: 185, background: `linear-gradient(135deg, ${selectedPeg.color}, #0f172a)` }}
                  >
                    <img
                      src={selectedPeg.img}
                      alt={selectedPeg.nome}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="peg-media-overlay" />
                    <div className="peg-media-top">
                      <span className="gps-chip">GPS: {selectedPeg.gps}</span>
                    </div>
                    <div className="peg-media-bottom">
                      <strong style={{ fontSize: 20 }}>{selectedPeg.nome}</strong>
                    </div>
                  </div>
                  <div className="card-pad stack-sm">
                    <div className="row-between text-xs text-muted">
                      <span>{selectedPeg.note}</span>
                      {selectedPeg.mapsUrl && (
                        <a
                          href={selectedPeg.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Google Maps <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Durata */}
                <div className="grid-3">
                  {([2, 3, 4] as DurationDays[]).map((d) => {
                    const pr = calculatePrice(selectedPeg, d, settings, isResidentVT);
                    const active = duration === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelectDuration(d)}
                        className="card"
                        style={{
                          padding: 12,
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: active ? 'var(--primary)' : 'var(--surface)',
                          color: active ? '#fff' : 'var(--ink)',
                          borderColor: active ? 'var(--primary)' : 'var(--border)',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700 }}>
                          {d} GG / {d - 1} {d - 1 === 1 ? 'NOTTE' : 'NOTTI'}
                        </div>
                        <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4 }}>
                          €{pr.finalPrice.toFixed(2)}
                        </div>
                        {pr.hasDiscount && (
                          <div style={{ fontSize: 11, textDecoration: 'line-through', opacity: 0.75 }}>
                            €{pr.base.toFixed(2)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <CalendarPicker
                  year={calYear}
                  month={calMonth}
                  pegId={selectedPeg.id}
                  selectedRange={selectedRange}
                  closures={closures}
                  bookings={bookings}
                  onChangeMonth={handleChangeMonth}
                  onSelectStartDate={handleSelectStartDate}
                />
              </div>

              {/* Riepilogo & Bonifico */}
              {(() => {
                const { finalPrice, hasDiscount } = calculatePrice(selectedPeg, duration, settings, isResidentVT);
                const causale = buildCausale(selectedPeg.numero, selectedRange);
                return (
                  <div className="card card-pad stack-md">
                    <h2 style={{ margin: 0, fontSize: 16 }}>Riepilogo Prenotazione</h2>

                    <div className="row-between text-sm">
                      <span className="text-muted">Periodo:</span>
                      <strong>
                        {selectedRange.length
                          ? `${formatDateIT(selectedRange[0])} → ${formatDateIT(selectedRange[selectedRange.length - 1])}`
                          : 'Seleziona data di arrivo'}
                      </strong>
                    </div>

                    <div
                      className="row-between"
                      style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 16, fontWeight: 800 }}
                    >
                      <span>Totale {hasDiscount ? '(Sconto VT -50%)' : ''}:</span>
                      <span style={{ color: 'var(--primary)' }}>€{finalPrice.toFixed(2)}</span>
                    </div>

                    {causale && (
                      <div className="stack-sm" style={{ background: 'var(--surface-muted)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div className="text-xs">
                          <strong>Beneficiario:</strong> {settings.beneficiary}
                        </div>
                        <div className="row-between text-xs">
                          <span>
                            <strong>IBAN:</strong> <span className="font-mono">{settings.iban}</span>
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => copyText('iban', settings.iban)}
                          >
                            {copiedKey === 'iban' ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div className="stack-sm" style={{ gap: 4 }}>
                          <div className="row-between text-xs">
                            <strong>Causale obbligatoria:</strong>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => copyText('causale', causale)}
                            >
                              {copiedKey === 'causale' ? <Check size={12} /> : <Copy size={12} />} Copia
                            </button>
                          </div>
                          <div className="mono-box" style={{ color: 'var(--primary)' }}>
                            {causale}
                          </div>
                        </div>
                        <div className="text-xs text-muted">
                          Saldo obbligatorio entro {settings.paymentDeadlineBeforeArrivalDays} gg dalla data di arrivo.
                          Carica la ricevuta in app (oppure WhatsApp {settings.whatsapp} / {settings.email}).
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      disabled={selectedRange.length === 0}
                      onClick={handleCreateBooking}
                    >
                      {selectedRange.length === 0
                        ? 'Seleziona una data di arrivo'
                        : `Conferma Prenotazione (€${finalPrice.toFixed(2)})`}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {tab === 'bookings' && (
          <div className="stack-md">
            <h2 style={{ margin: 0, fontSize: 18 }}>Le mie prenotazioni ({myBookings.length})</h2>
            {!user ? (
              <div className="card card-pad stack-sm" style={{ maxWidth: 460 }}>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Accedi al tuo account per visualizzare le prenotazioni e caricare le ricevute di bonifico.
                </p>
                <button type="button" className="btn btn-primary" style={{ width: 'fit-content' }} onClick={() => setShowAuth(true)}>
                  <LogIn size={15} /> Accedi o Registrati
                </button>
              </div>
            ) : myBookings.length === 0 ? (
              <div className="card card-pad text-sm text-muted">
                Non hai ancora prenotazioni. Vai su <strong>Piazzole</strong> per prenotare la tua postazione.
              </div>
            ) : (
              <div className="grid-2">
                {myBookings.map((b) => {
                  const peg = PEGS.find((p) => p.id === b.pegId);
                  const refund = getRefundPolicy(b.dates[0]);
                  const meta = STATUS_BADGE[b.status];
                  return (
                    <div key={b.id} className="card card-pad stack-sm">
                      <div className="row-between">
                        <div>
                          <strong style={{ fontSize: 15 }}>{peg ? peg.nome : `Piazzola ${b.pegId}`}</strong>
                          <div className="text-xs text-muted">
                            #{b.id} • {formatDateIT(b.dates[0])} → {formatDateIT(b.dates[b.dates.length - 1])}
                          </div>
                        </div>
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      </div>

                      <div className="mono-box">{b.causale}</div>

                      <div className="text-sm">
                        Importo: <strong>€{b.total.toFixed(2)}</strong> {b.discountApplied ? '(VT -50%)' : ''}
                      </div>

                      {b.status === 'in_attesa_pagamento' && (
                        <label className="btn btn-primary btn-full" style={{ cursor: 'pointer' }}>
                          <Upload size={15} /> Carica Ricevuta Bonifico (PDF / Foto)
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleUploadReceipt(b, e.target.files?.[0] || null)}
                          />
                        </label>
                      )}

                      {b.proofFile && (
                        <div className="text-xs text-muted">
                          Ricevuta caricata: <strong>{b.proofFile}</strong>
                        </div>
                      )}

                      {['in_attesa_pagamento', 'prova_caricata', 'confermata'].includes(b.status) && (
                        <div className="stack-sm" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                          <div className="text-xs text-muted">{refund.label}</div>
                          <button
                            type="button"
                            className="btn btn-danger-outline btn-sm btn-full"
                            onClick={() => handleCancelBooking(b)}
                          >
                            Disdici Prenotazione
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'rules' && (
          <div className="stack-md" style={{ maxWidth: 760 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Regolamento Carpfishing Gradoli</h2>

            <div className="card card-pad stack-sm">
              <strong style={{ color: 'var(--primary)', fontSize: 14 }}>Documentazione necessaria</strong>
              <ul className="text-sm text-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li><strong>Licenza di pesca</strong> in corso di validità</li>
                <li><strong>Autorizzazione comunale</strong></li>
                <li><strong>Tesserino segna catture</strong></li>
              </ul>
            </div>

            <div className="card card-pad stack-sm">
              <strong style={{ color: 'var(--primary)', fontSize: 14 }}>Regole di comportamento</strong>
              <ul className="text-sm text-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.65 }}>
                <li>Le postazioni sono concesse a <strong>due pescatori con due tende</strong>.</li>
                <li>È consentito l&apos;accesso a <strong>camper</strong> a condizione che rimanga parcheggiato <strong>senza aprire la veranda e/o poggiare i piedini</strong>.</li>
                <li>Mantenere la postazione pulita: recuperare e gettare negli appositi contenitori qualsiasi tipo d&apos;immondizia, inclusi residui di esche.</li>
                <li>Qualora la zona di pesca venga occupata dai <strong>pescatori professionali</strong>, non interferire con il lavoro dei suddetti ed in caso di necessità chiamare il numero del pescatore proprietario della rete (reperibile sulle boe di segnalazione reti). In caso di comportamento inappropriato recante danni alle reti, i carpisti verranno <strong>immediatamente allontanati ed interdetti dalle successive prenotazioni per 12 mesi</strong>.</li>
              </ul>
            </div>

            <div className="card card-pad stack-sm">
              <strong style={{ color: 'var(--primary)', fontSize: 14 }}>Rimborsi in caso di disdetta</strong>
              <div className="text-sm text-muted">• Oltre 15 giorni prima dell&apos;arrivo: <strong>rimborso 80%</strong></div>
              <div className="text-sm text-muted">• Tra 7 e 15 giorni prima dell&apos;arrivo: <strong>rimborso 50%</strong></div>
              <div className="text-sm text-muted">• Da 6 giorni prima dell&apos;arrivo: <strong>nessun rimborso (0%)</strong></div>
            </div>

            <a
              href="https://carpfishingradoli.webnode.it/regolamento/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: 'fit-content' }}
            >
              Scarica Regolamento Provinciale &amp; Tesserini (Sito Ufficiale) <ExternalLink size={14} />
            </a>
          </div>
        )}

        {tab === 'profile' && (
          <div className="stack-md" style={{ maxWidth: 520 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Profilo Utente</h2>
            {!user ? (
              <div className="card card-pad stack-sm">
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  Non hai ancora effettuato l&apos;accesso.
                </p>
                <button type="button" className="btn btn-primary" style={{ width: 'fit-content' }} onClick={() => setShowAuth(true)}>
                  <LogIn size={15} /> Accedi o Registrati
                </button>
              </div>
            ) : (
              <div className="card card-pad stack-md">
                <div className="row-between">
                  <div>
                    <strong style={{ fontSize: 16 }}>{user.nome} {user.cognome}</strong>
                    <div className="text-xs text-muted">{user.email}</div>
                  </div>
                  <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-muted'}`}>
                    {isAdmin ? 'Amministratore' : 'Pescatore'}
                  </span>
                </div>

                <div className="row-between text-sm">
                  <span className="text-muted">Telefono:</span>
                  <span>{user.telefono || 'Non indicato'}</span>
                </div>

                <div className="row-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>Residente Provincia di Viterbo (VT)</div>
                    <div className="text-xs text-muted">Sblocca Piazzola 1R e sconto 50% su 1R, 3, 5, 10, 14</div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm ${user.residenteVT ? 'btn-success' : 'btn-secondary'}`}
                    onClick={handleToggleResidentVT}
                  >
                    {user.residenteVT ? 'SÌ (VT)' : 'NO'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'admin' && isAdmin && (
          <AdminPanel
            bookings={bookings}
            closures={closures}
            settings={settings}
            emailLogs={emailLogs}
            onApprove={handleAdminApprove}
            onReject={handleAdminReject}
            onSimulateDayPass={handleSimulateDayPass}
            onAddClosure={async (s, e, m) => {
              await store.addClosure({ startDate: s, endDate: e, motivo: m });
              await refreshAll();
              notify('Chiusura globale aggiunta su tutti i calendari.');
            }}
            onRemoveClosure={async (id) => {
              await store.removeClosure(id);
              await refreshAll();
              notify('Chiusura globale rimossa.');
            }}
            onSaveSettings={async (next) => {
              await store.saveSettings(next);
              await refreshAll();
              notify('Listino e parametri X/Y salvati!');
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav" aria-label="Navigazione mobile">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-btn ${tab === item.id ? 'active' : ''}`}
              onClick={() => { setTab(item.id); setSelectedPeg(null); }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={(u) => {
            setUser(u);
            setShowAuth(false);
            notify(`Benvenuto ${u.nome}!`);
            refreshAll();
          }}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

export default App;
