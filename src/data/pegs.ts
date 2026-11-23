import type { AppSettings, Booking, EmailLog, GlobalClosure, Peg, UserProfile } from '../types';

const RAW_PEGS = [
  { numero: '1R', gps: '42.64243, 11.89055', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000027-784cc79477/postazione%2017-5.jpeg?ph=e106e77c4c' },
  { numero: '2', gps: '42.63960, 11.88922', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000034-7f0217ffa9/postazione%207-0.jpeg?ph=e106e77c4c' },
  { numero: '3', gps: '42.63862, 11.88918', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000033-4e3334f31d/postazione%208-6.jpeg?ph=e106e77c4c' },
  { numero: '4', gps: '42.63845, 11.88909', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000035-32d2033ca1/postazione%206-7.jpeg?ph=e106e77c4c' },
  { numero: '5', gps: '42.63659, 11.88822', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000032-3e9503f8ed/postazione%209-4.jpeg?ph=e106e77c4c' },
  { numero: '6', gps: '42.63543, 11.88584', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000031-996c69a67a/postazione%20%2010-0.jpeg?ph=e106e77c4c' },
  { numero: '7', gps: '42.63502, 11.88498', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000030-e88dce9864/postazione%2011-1.jpeg?ph=e106e77c4c' },
  { numero: '8', gps: '42.63317, 11.88260', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000029-4480a457c3/postazione%2012-0.jpeg?ph=e106e77c4c' },
  { numero: '8A', gps: 'Da inserire', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000069-bdaaebdab0/Piazzola%208A.jpeg?ph=e106e77c4c' },
  { numero: '9', gps: '42.62888, 11.87667', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000023-0714508112/postazione%2018-7.jpeg?ph=e106e77c4c' },
  { numero: '10', gps: '42.62489, 11.87469', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000028-939e894985/postazione%2013-8.jpeg?ph=e106e77c4c' },
  { numero: '11', gps: '42.62417, 11.87429', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000026-dfd4be0ce6/postazione%2014-3.jpeg?ph=e106e77c4c' },
  { numero: '12', gps: '42.61967, 11.87280', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000024-98920998d8/postazione%2015-4.jpeg?ph=e106e77c4c' },
  { numero: '12A', gps: 'Da inserire', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000067-535b4535b8/Piazzola%2012.jpeg?ph=e106e77c4c' },
  { numero: '13', gps: '42.61597, 11.86973', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000025-429d543976/postazione%2016-4.jpeg?ph=e106e77c4c' },
  { numero: '14', gps: '42.61271, 11.86737', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000036-d5e1dd6d9d/postazione%205-7.jpeg?ph=e106e77c4c' },
  { numero: '15', gps: '42.61186, 11.86681', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000037-85c9586c2c/postazione%204-7.jpeg?ph=e106e77c4c' },
  { numero: '16', gps: '42.60843, 11.86739', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000038-4c2894d226/postazione%203-3.jpeg?ph=e106e77c4c' },
  { numero: '17', gps: '42.60637, 11.86787', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000039-f132cf227b/postazione%202-3.jpeg?ph=e106e77c4c' },
  { numero: '18', gps: '42.60011, 11.86583', img: 'https://e106e77c4c.clvaw-cdnwnd.com/44c496e4552f22f7501c37bffd5c19ef/200000040-a4fe7a5fa1/postazione%201-8.jpeg?ph=e106e77c4c' },
];

const PALETTE = ['#0f766e', '#115e59', '#15803d', '#0369a1', '#0e7490', '#1d4ed8'];

export const PEGS: Peg[] = RAW_PEGS.map((item, idx) => {
  const residentOnly = item.numero === '1R';
  const residentDiscount = ['1R', '3', '5', '10', '14'].includes(item.numero);
  return {
    id: item.numero,
    numero: item.numero,
    nome: `Piazzola ${item.numero}`,
    gps: item.gps,
    mapsUrl:
      item.gps !== 'Da inserire'
        ? `https://maps.google.com/?q=${item.gps.replace(/\s+/g, '')}`
        : null,
    img: item.img,
    note: residentOnly
      ? 'Riservata esclusivamente ai residenti nella provincia di Viterbo (sconto 50%).'
      : residentDiscount
        ? 'Sconto 50% riservato ai residenti nella provincia di Viterbo.'
        : 'Postazione Lago di Bolsena — Comune di Gradoli.',
    residentOnly,
    residentDiscount,
    color: residentOnly ? '#b45309' : PALETTE[idx % PALETTE.length],
  };
});

export const DEFAULT_SETTINGS: AppSettings = {
  packages: {
    2: { label: '2 GIORNI - 1 NOTTE', price: 27 },
    3: { label: '3 GIORNI - 2 NOTTI', price: 40 },
    4: { label: '4 GIORNI - 3 NOTTI', price: 55 },
  },
  residentDiscountPct: 50,
  paymentDeadlineBeforeArrivalDays: 20,
  reminderDaysX: 2,
  expireExtraDaysY: 2,
  beneficiary: 'Comune di Gradoli Servizio Tesoreria',
  iban: 'IT07H0760103200001064301664',
  whatsapp: '+393318495877',
  email: 'prenotazioni@carpfishingradoli.it',
  pec: 'carpfishingradoli@pec.it',
};

export const SEED_USERS: Array<UserProfile & { password: string }> = [
  {
    id: 'u1',
    nome: 'Marco',
    cognome: 'Rossi',
    email: 'marco.rossi@email.it',
    telefono: '+39 333 1234567',
    residenteVT: false,
    role: 'user',
    emailVerified: true,
    phoneVerified: true,
    password: 'password123',
  },
  {
    id: 'admin1',
    nome: 'Comune',
    cognome: 'di Gradoli',
    email: 'admin@carpfishingradoli.it',
    telefono: '+39 331 8495877',
    residenteVT: true,
    role: 'admin',
    emailVerified: true,
    phoneVerified: true,
    password: 'admin123',
  },
];

export const SEED_CLOSURES: GlobalClosure[] = [
  { id: 'c1', startDate: '2026-11-28', endDate: '2026-11-30', motivo: 'Manutenzione sponde (periodo 3 gg)' },
  { id: 'c2', startDate: '2026-12-06', endDate: '2026-12-06', motivo: 'Gara sociale invernale' },
];

export const SEED_BOOKINGS: Booking[] = [
  {
    id: 'b101',
    pegId: '2',
    userId: 'u2',
    userName: 'Luca Bianchi',
    userEmail: 'luca.b@email.it',
    dates: ['2026-11-25', '2026-11-26'],
    duration: 2,
    total: 27,
    discountApplied: false,
    causale: 'CARPFISHING DAL 25/11/2026 AL 26/11/2026 PIAZZOLA N° 2',
    status: 'confermata',
    proofFile: 'bonifico_bianchi.pdf',
    daysElapsed: 1,
    reminderSent: false,
  },
  {
    id: 'b102',
    pegId: '3',
    userId: 'u1',
    userName: 'Marco Rossi',
    userEmail: 'marco.rossi@email.it',
    dates: ['2026-12-10', '2026-12-11', '2026-12-12'],
    duration: 3,
    total: 40,
    discountApplied: false,
    causale: 'CARPFISHING DAL 10/12/2026 AL 12/12/2026 PIAZZOLA N° 3',
    status: 'confermata',
    proofFile: 'ricevuta_bonifico_b102.jpg',
    daysElapsed: 1,
    reminderSent: false,
  },
];

export const SEED_EMAIL_LOGS: EmailLog[] = [
  {
    id: 'e1',
    time: 'Oggi 09:00',
    to: 'marco.rossi@email.it',
    subject: 'Prenotazione #b102 CONFERMATA — Piazzola 3 (10/12 - 12/12)',
  },
];
