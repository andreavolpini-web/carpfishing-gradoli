import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DAYS_SHORT_IT, getTodayISO, MONTHS_IT, pad } from '../lib/dates';
import type { Booking, GlobalClosure } from '../types';

interface CalendarPickerProps {
  year: number;
  month: number;
  pegId: string;
  selectedRange: string[];
  closures: GlobalClosure[];
  bookings: Booking[];
  onChangeMonth: (delta: number) => void;
  onSelectStartDate: (iso: string) => void;
}

export function CalendarPicker({
  year,
  month,
  pegId,
  selectedRange,
  closures,
  bookings,
  onChangeMonth,
  onSelectStartDate,
}: CalendarPickerProps) {
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayISO = getTodayISO();

  const isClosed = (iso: string) => closures.some((c) => iso >= c.startDate && iso <= c.endDate);
  const isOccupied = (iso: string) =>
    bookings.some(
      (b) =>
        b.pegId === pegId &&
        ['in_attesa_pagamento', 'prova_caricata', 'confermata'].includes(b.status) &&
        b.dates.includes(iso),
    );

  const blanks = Array.from({ length: startDow }, (_, i) => <div key={`b-${i}`} />);
  const days = Array.from({ length: daysInMonth }, (_, idx) => {
    const d = idx + 1;
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    const closed = isClosed(iso);
    const occupied = isOccupied(iso);
    const past = iso < todayISO;
    const selected = selectedRange.includes(iso);

    let cls = 'cal-day';
    let sub = '';
    if (closed) {
      cls += ' closed';
      sub = 'Chiuso';
    } else if (occupied) {
      cls += ' occupied';
      sub = 'Occup.';
    } else if (past) {
      cls += ' past';
    } else if (selected) {
      cls += ' selected';
    }

    return (
      <button
        key={iso}
        type="button"
        className={cls}
        disabled={closed || occupied || past}
        onClick={() => onSelectStartDate(iso)}
      >
        <span>{d}</span>
        {sub && <span className="cal-sub">{sub}</span>}
      </button>
    );
  });

  return (
    <div className="card card-pad stack-sm">
      <div className="row-between">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChangeMonth(-1)} aria-label="Mese precedente">
          <ChevronLeft size={16} />
        </button>
        <strong style={{ fontSize: 14 }}>
          {MONTHS_IT[month]} {year}
        </strong>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChangeMonth(1)} aria-label="Mese successivo">
          <ChevronRight size={16} />
        </button>
      </div>

      <p className="text-xs text-muted" style={{ margin: 0, textAlign: 'center' }}>
        Seleziona la <strong>data di arrivo</strong> sul calendario
      </p>

      <div className="cal-grid text-xs text-muted" style={{ textAlign: 'center', fontWeight: 600 }}>
        {DAYS_SHORT_IT.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="cal-grid">
        {blanks}
        {days}
      </div>
    </div>
  );
}
