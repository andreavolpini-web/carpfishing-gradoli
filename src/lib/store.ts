import {
  DEFAULT_SETTINGS,
  SEED_BOOKINGS,
  SEED_CLOSURES,
  SEED_EMAIL_LOGS,
  SEED_USERS,
} from '../data/pegs';
import type {
  AppSettings,
  Booking,
  EmailLog,
  GlobalClosure,
  UserProfile,
} from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

const LS_KEYS = {
  users: 'cg_users_v1',
  session: 'cg_session_v1',
  bookings: 'cg_bookings_v1',
  closures: 'cg_closures_v1',
  settings: 'cg_settings_v1',
  emailLogs: 'cg_email_logs_v1',
};

type StoredUser = UserProfile & { password: string };

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureLocalSeed() {
  if (!localStorage.getItem(LS_KEYS.users)) writeLS(LS_KEYS.users, SEED_USERS);
  if (!localStorage.getItem(LS_KEYS.bookings)) writeLS(LS_KEYS.bookings, SEED_BOOKINGS);
  if (!localStorage.getItem(LS_KEYS.closures)) writeLS(LS_KEYS.closures, SEED_CLOSURES);
  if (!localStorage.getItem(LS_KEYS.settings)) writeLS(LS_KEYS.settings, DEFAULT_SETTINGS);
  if (!localStorage.getItem(LS_KEYS.emailLogs)) writeLS(LS_KEYS.emailLogs, SEED_EMAIL_LOGS);
}

export interface AuthResult {
  user: UserProfile | null;
  error?: string;
}

export const store = {
  isCloud: isSupabaseConfigured,

  // --- AUTH ---
  async getCurrentUser(): Promise<UserProfile | null> {
    if (isSupabaseConfigured && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (!data) return null;
      return {
        id: data.id,
        nome: data.nome,
        cognome: data.cognome,
        email: data.email,
        telefono: data.telefono || '',
        residenteVT: Boolean(data.residente_vt),
        role: data.role === 'admin' ? 'admin' : 'user',
        emailVerified: true,
        phoneVerified: Boolean(data.telefono),
      };
    }
    ensureLocalSeed();
    return readLS<UserProfile | null>(LS_KEYS.session, null);
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) return { user: null, error: 'Credenziali non valide o email non confermata.' };
      const user = await this.getCurrentUser();
      return { user };
    }
    ensureLocalSeed();
    const users = readLS<StoredUser[]>(LS_KEYS.users, SEED_USERS);
    const found = users.find((u) => u.email.toLowerCase() === cleanEmail && u.password === password);
    if (!found) return { user: null, error: 'Email o password errati.' };
    const { password: _p, ...profile } = found;
    writeLS(LS_KEYS.session, profile);
    return { user: profile };
  },

  async register(input: {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    password: string;
    residenteVT: boolean;
  }): Promise<AuthResult> {
    const cleanEmail = input.email.trim().toLowerCase();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: input.password,
        options: {
          data: {
            nome: input.nome.trim(),
            cognome: input.cognome.trim(),
            telefono: input.telefono.trim(),
            residente_vt: input.residenteVT,
          },
        },
      });
      if (error) return { user: null, error: error.message };
      const user = await this.getCurrentUser();
      return { user };
    }
    ensureLocalSeed();
    const users = readLS<StoredUser[]>(LS_KEYS.users, SEED_USERS);
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { user: null, error: 'Esiste già un account con questa email.' };
    }
    const newUser: StoredUser = {
      id: 'u' + Date.now(),
      nome: input.nome.trim(),
      cognome: input.cognome.trim(),
      email: cleanEmail,
      telefono: input.telefono.trim(),
      residenteVT: input.residenteVT,
      role: 'user',
      emailVerified: true,
      phoneVerified: Boolean(input.telefono.trim()),
      password: input.password,
    };
    users.push(newUser);
    writeLS(LS_KEYS.users, users);
    const { password: _p, ...profile } = newUser;
    writeLS(LS_KEYS.session, profile);
    return { user: profile };
  },

  async loginWithOAuth(provider: 'google' | 'apple'): Promise<AuthResult> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) return { user: null, error: error.message };
      return { user: null };
    }

    ensureLocalSeed();
    const email = provider === 'google' ? 'pescatore.gmail@gmail.com' : 'pescatore.apple@icloud.com';
    const users = readLS<StoredUser[]>(LS_KEYS.users, SEED_USERS);
    let found = users.find((u) => u.email === email);
    if (!found) {
      found = {
        id: `u_${provider}`,
        nome: provider === 'google' ? 'Utente' : 'Utente',
        cognome: provider === 'google' ? 'Google' : 'Apple',
        email,
        telefono: '',
        residenteVT: false,
        role: 'user',
        emailVerified: true,
        phoneVerified: false,
        password: '',
      };
      users.push(found);
      writeLS(LS_KEYS.users, users);
    }
    const { password: _p, ...profile } = found;
    writeLS(LS_KEYS.session, profile);
    return { user: profile };
  },

  onAuthChange(callback: () => void): () => void {
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(() => {
        callback();
      });
      return () => data.subscription.unsubscribe();
    }
    return () => {};
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      return;
    }
    localStorage.removeItem(LS_KEYS.session);
  },

  async updateProfile(userId: string, patch: Partial<Pick<UserProfile, 'residenteVT' | 'telefono'>>): Promise<UserProfile | null> {
    if (isSupabaseConfigured && supabase) {
      const dbPatch: Record<string, unknown> = {};
      if (patch.residenteVT !== undefined) dbPatch.residente_vt = patch.residenteVT;
      if (patch.telefono !== undefined) dbPatch.telefono = patch.telefono;
      await supabase.from('profiles').update(dbPatch).eq('id', userId);
      return this.getCurrentUser();
    }
    const users = readLS<StoredUser[]>(LS_KEYS.users, SEED_USERS);
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    writeLS(LS_KEYS.users, users);
    const { password: _p, ...profile } = users[idx];
    writeLS(LS_KEYS.session, profile);
    return profile;
  },

  // --- DATA LOAD ---
  async loadAll(): Promise<{
    bookings: Booking[];
    closures: GlobalClosure[];
    settings: AppSettings;
    emailLogs: EmailLog[];
  }> {
    if (isSupabaseConfigured && supabase) {
      const [bRes, cRes, sRes, eRes] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('global_closures').select('*').order('start_date', { ascending: true }),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
        supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);

      const bookings: Booking[] = (bRes.data || []).map((r) => ({
        id: r.id,
        pegId: r.peg_id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        dates: r.dates || [],
        duration: r.duration,
        total: Number(r.total),
        discountApplied: Boolean(r.discount_applied),
        causale: r.causale,
        status: r.status,
        proofFile: r.proof_file,
        proofUrl: r.proof_url,
        daysElapsed: r.days_elapsed ?? 0,
        reminderSent: Boolean(r.reminder_sent),
        createdAt: r.created_at,
      }));

      const closures: GlobalClosure[] = (cRes.data || []).map((c) => ({
        id: c.id,
        startDate: c.start_date,
        endDate: c.end_date,
        motivo: c.motivo,
      }));

      const s = sRes.data;
      const settings: AppSettings = s
        ? {
            packages: {
              2: { label: '2 GIORNI - 1 NOTTE', price: Number(s.price_2_days) },
              3: { label: '3 GIORNI - 2 NOTTI', price: Number(s.price_3_days) },
              4: { label: '4 GIORNI - 3 NOTTI', price: Number(s.price_4_days) },
            },
            residentDiscountPct: s.resident_discount_pct,
            paymentDeadlineBeforeArrivalDays: s.payment_deadline_before_arrival_days,
            reminderDaysX: s.reminder_days_x,
            expireExtraDaysY: s.expire_extra_days_y,
            beneficiary: s.beneficiary,
            iban: s.iban,
            whatsapp: s.whatsapp,
            email: s.email,
            pec: s.pec,
            unlockedMonths: Array.isArray(s.unlocked_months) ? s.unlocked_months : [],
          }
        : DEFAULT_SETTINGS;

      const emailLogs: EmailLog[] = (eRes.data || []).map((l) => ({
        id: l.id,
        time: new Date(l.created_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }),
        to: l.recipient,
        subject: l.subject,
      }));

      return { bookings, closures, settings, emailLogs };
    }

    ensureLocalSeed();
    const localSettings = readLS<AppSettings>(LS_KEYS.settings, DEFAULT_SETTINGS);
    return {
      bookings: readLS<Booking[]>(LS_KEYS.bookings, SEED_BOOKINGS),
      closures: readLS<GlobalClosure[]>(LS_KEYS.closures, SEED_CLOSURES),
      settings: {
        ...DEFAULT_SETTINGS,
        ...localSettings,
        unlockedMonths: Array.isArray(localSettings.unlockedMonths) ? localSettings.unlockedMonths : [],
      },
      emailLogs: readLS<EmailLog[]>(LS_KEYS.emailLogs, SEED_EMAIL_LOGS),
    };
  },

  // --- MUTATIONS ---
  async createBooking(booking: Booking, emailSubject: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('bookings').insert({
        id: booking.id,
        peg_id: booking.pegId,
        user_id: booking.userId,
        user_name: booking.userName,
        user_email: booking.userEmail,
        dates: booking.dates,
        duration: booking.duration,
        total: booking.total,
        discount_applied: booking.discountApplied,
        causale: booking.causale,
        status: booking.status,
      });
      await supabase.from('email_logs').insert({ recipient: booking.userEmail, subject: emailSubject });
      return;
    }
    const bookings = readLS<Booking[]>(LS_KEYS.bookings, SEED_BOOKINGS);
    bookings.unshift(booking);
    writeLS(LS_KEYS.bookings, bookings);
    await this.addEmailLog(booking.userEmail, emailSubject);
  },

  async uploadReceipt(bookingId: string, file: File, adminEmail: string, emailSubject: string): Promise<{ proofFile: string; proofUrl: string | null }> {
    if (isSupabaseConfigured && supabase) {
      const path = `${bookingId}/${Date.now()}_${file.name}`;
      await supabase.storage.from('receipts').upload(path, file, { upsert: true });
      const { data: signed } = await supabase.storage.from('receipts').createSignedUrl(path, 60 * 60 * 24 * 30);
      const proofUrl = signed?.signedUrl ?? null;
      await supabase
        .from('bookings')
        .update({ proof_file: file.name, proof_url: proofUrl, status: 'prova_caricata' })
        .eq('id', bookingId);
      await supabase.from('email_logs').insert({ recipient: adminEmail, subject: emailSubject });
      return { proofFile: file.name, proofUrl };
    }

    const proofUrl = await new Promise<string | null>((resolve) => {
      if (file.size > 2 * 1024 * 1024) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    const bookings = readLS<Booking[]>(LS_KEYS.bookings, SEED_BOOKINGS);
    const b = bookings.find((x) => x.id === bookingId);
    if (b) {
      b.proofFile = file.name;
      b.proofUrl = proofUrl;
      b.status = 'prova_caricata';
      writeLS(LS_KEYS.bookings, bookings);
    }
    await this.addEmailLog(adminEmail, emailSubject);
    return { proofFile: file.name, proofUrl };
  },

  async updateBookingStatus(
    bookingId: string,
    patch: Partial<Pick<Booking, 'status' | 'proofFile' | 'proofUrl' | 'daysElapsed' | 'reminderSent'>>,
    logRecipient?: string,
    logSubject?: string,
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const dbPatch: Record<string, unknown> = {};
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.proofFile !== undefined) dbPatch.proof_file = patch.proofFile;
      if (patch.proofUrl !== undefined) dbPatch.proof_url = patch.proofUrl;
      if (patch.daysElapsed !== undefined) dbPatch.days_elapsed = patch.daysElapsed;
      if (patch.reminderSent !== undefined) dbPatch.reminder_sent = patch.reminderSent;
      await supabase.from('bookings').update(dbPatch).eq('id', bookingId);
      if (logRecipient && logSubject) {
        await supabase.from('email_logs').insert({ recipient: logRecipient, subject: logSubject });
      }
      return;
    }
    const bookings = readLS<Booking[]>(LS_KEYS.bookings, SEED_BOOKINGS);
    const idx = bookings.findIndex((x) => x.id === bookingId);
    if (idx !== -1) {
      bookings[idx] = { ...bookings[idx], ...patch };
      writeLS(LS_KEYS.bookings, bookings);
    }
    if (logRecipient && logSubject) {
      await this.addEmailLog(logRecipient, logSubject);
    }
  },

  async addClosure(closure: Omit<GlobalClosure, 'id'>): Promise<GlobalClosure> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('global_closures')
        .insert({ start_date: closure.startDate, end_date: closure.endDate, motivo: closure.motivo })
        .select()
        .single();
      return {
        id: data?.id || 'c' + Date.now(),
        startDate: closure.startDate,
        endDate: closure.endDate,
        motivo: closure.motivo,
      };
    }
    const item: GlobalClosure = { id: 'c' + Date.now(), ...closure };
    const closures = readLS<GlobalClosure[]>(LS_KEYS.closures, SEED_CLOSURES);
    closures.push(item);
    closures.sort((a, b) => a.startDate.localeCompare(b.startDate));
    writeLS(LS_KEYS.closures, closures);
    return item;
  },

  async removeClosure(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('global_closures').delete().eq('id', id);
      return;
    }
    const closures = readLS<GlobalClosure[]>(LS_KEYS.closures, SEED_CLOSURES).filter((c) => c.id !== id);
    writeLS(LS_KEYS.closures, closures);
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('app_settings')
        .update({
          price_2_days: settings.packages[2].price,
          price_3_days: settings.packages[3].price,
          price_4_days: settings.packages[4].price,
          reminder_days_x: settings.reminderDaysX,
          expire_extra_days_y: settings.expireExtraDaysY,
          unlocked_months: settings.unlockedMonths,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
      return;
    }
    writeLS(LS_KEYS.settings, settings);
  },

  async addEmailLog(to: string, subject: string): Promise<void> {
    const logs = readLS<EmailLog[]>(LS_KEYS.emailLogs, SEED_EMAIL_LOGS);
    logs.unshift({
      id: 'e' + Date.now() + Math.random().toString(36).slice(2, 6),
      time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      to,
      subject,
    });
    writeLS(LS_KEYS.emailLogs, logs.slice(0, 50));
  },
};
