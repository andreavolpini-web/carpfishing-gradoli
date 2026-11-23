export type DurationDays = 2 | 3 | 4;

export type BookingStatus =
  | 'in_attesa_pagamento'
  | 'prova_caricata'
  | 'confermata'
  | 'scaduta'
  | 'annullata';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  residenteVT: boolean;
  role: UserRole;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export interface Peg {
  id: string;
  numero: string;
  nome: string;
  gps: string;
  mapsUrl: string | null;
  img: string;
  note: string;
  residentOnly: boolean;
  residentDiscount: boolean;
  color: string;
}

export interface GlobalClosure {
  id: string;
  startDate: string;
  endDate: string;
  motivo: string;
}

export interface Booking {
  id: string;
  pegId: string;
  userId?: string;
  userName: string;
  userEmail: string;
  dates: string[];
  duration: DurationDays;
  total: number;
  discountApplied: boolean;
  causale: string;
  status: BookingStatus;
  proofFile: string | null;
  proofUrl?: string | null;
  daysElapsed: number;
  reminderSent: boolean;
  createdAt?: string;
}

export interface EmailLog {
  id: string;
  time: string;
  to: string;
  subject: string;
}

export interface AppSettings {
  packages: Record<DurationDays, { label: string; price: number }>;
  residentDiscountPct: number;
  paymentDeadlineBeforeArrivalDays: number;
  reminderDaysX: number;
  expireExtraDaysY: number;
  beneficiary: string;
  iban: string;
  whatsapp: string;
  email: string;
  pec: string;
  unlockedMonths: string[];
}
