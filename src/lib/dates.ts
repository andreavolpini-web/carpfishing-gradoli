import type { AppSettings, DurationDays, Peg } from '../types';

export const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export const DAYS_SHORT_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function getTodayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatDateIT(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function daysBetweenISO(isoA: string, isoB: string): number {
  const a = new Date(`${isoA}T00:00:00Z`);
  const b = new Date(`${isoB}T00:00:00Z`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function buildDateRange(startISO: string, duration: DurationDays): string[] {
  const arr: string[] = [];
  for (let i = 0; i < duration; i++) {
    arr.push(addDaysISO(startISO, i));
  }
  return arr;
}

export function calculatePrice(
  peg: Peg,
  duration: DurationDays,
  settings: AppSettings,
  isResidentVT: boolean,
) {
  const base = settings.packages[duration].price;
  const hasDiscount = isResidentVT && peg.residentDiscount;
  const finalPrice = hasDiscount ? base * (1 - settings.residentDiscountPct / 100) : base;
  return { base, finalPrice, hasDiscount };
}

export function buildCausale(pegNumero: string, dates: string[]): string {
  if (dates.length === 0) return '';
  return `CARPFISHING DAL ${formatDateIT(dates[0])} AL ${formatDateIT(dates[dates.length - 1])} PIAZZOLA N° ${pegNumero}`;
}

export function getRefundPolicy(arrivalISO: string, todayISO = getTodayISO()) {
  const daysBefore = daysBetweenISO(todayISO, arrivalISO);
  if (daysBefore > 15) {
    return { pct: 80, label: `Disdetta a ${daysBefore} gg dall'arrivo (> 15 gg): rimborso 80%` };
  }
  if (daysBefore >= 7) {
    return { pct: 50, label: `Disdetta a ${daysBefore} gg dall'arrivo (7-15 gg): rimborso 50%` };
  }
  return { pct: 0, label: `Disdetta a ${daysBefore} gg dall'arrivo (<= 6 gg): nessun rimborso (0%)` };
}
