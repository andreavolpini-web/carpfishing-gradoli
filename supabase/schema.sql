-- =============================================================================
-- Carpfishing Gradoli — Schema Database Supabase (PostgreSQL + RLS + Storage)
-- Incolla ed esegui questo script nell'SQL Editor di Supabase (Piano Gratuito)
-- =============================================================================

-- 1. PROFILI UTENTI (estende auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cognome text not null,
  email text not null,
  telefono text default '',
  residente_vt boolean not null default false,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Trigger automatico: crea il profilo quando un utente si registra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, cognome, email, telefono, residente_vt, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Utente'),
    coalesce(new.raw_user_meta_data->>'cognome', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'telefono', ''),
    coalesce((new.raw_user_meta_data->>'residente_vt')::boolean, false),
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. IMPOSTAZIONI APPLICAZIONE (singola riga id = 1)
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  price_2_days numeric(8,2) not null default 27,
  price_3_days numeric(8,2) not null default 40,
  price_4_days numeric(8,2) not null default 55,
  resident_discount_pct int not null default 50,
  payment_deadline_before_arrival_days int not null default 20,
  reminder_days_x int not null default 2,
  expire_extra_days_y int not null default 2,
  beneficiary text not null default 'Comune di Gradoli Servizio Tesoreria',
  iban text not null default 'IT07H0760103200001064301664',
  whatsapp text not null default '+393318495877',
  email text not null default 'prenotazioni@carpfishingradoli.it',
  pec text not null default 'carpfishingradoli@pec.it',
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- 3. CHIUSURE GLOBALI (Pesca interdetta su tutte le 20 piazzole)
create table if not exists public.global_closures (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  motivo text not null default 'Pesca interdetta',
  created_at timestamptz not null default now()
);

-- 4. PRENOTAZIONI
create table if not exists public.bookings (
  id text primary key,
  peg_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text not null,
  user_email text not null,
  dates text[] not null,
  duration int not null check (duration in (2, 3, 4)),
  total numeric(8,2) not null,
  discount_applied boolean not null default false,
  causale text not null,
  status text not null default 'in_attesa_pagamento'
    check (status in ('in_attesa_pagamento', 'prova_caricata', 'confermata', 'scaduta', 'annullata')),
  proof_file text,
  proof_url text,
  days_elapsed int not null default 0,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. LOG EMAIL AUTOMATICHE
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  subject text not null,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.global_closures enable row level security;
alter table public.bookings enable row level security;
alter table public.email_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: ognuno legge/modifica il proprio; admin legge tutti
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- App settings: tutti leggono; solo admin aggiorna
create policy "settings_select_all" on public.app_settings for select using (true);
create policy "settings_update_admin" on public.app_settings for update using (public.is_admin());

-- Global closures: tutti leggono; solo admin gestisce
create policy "closures_select_all" on public.global_closures for select using (true);
create policy "closures_all_admin" on public.global_closures for all using (public.is_admin());

-- Bookings: tutti leggono le date occupate; utenti creano/aggiornano le proprie; admin gestisce tutto
create policy "bookings_select_all" on public.bookings for select using (true);
create policy "bookings_insert_auth" on public.bookings for insert with check (auth.uid() = user_id);
create policy "bookings_update_own_or_admin" on public.bookings
  for update using (auth.uid() = user_id or public.is_admin());

-- Email logs: solo admin legge; utenti autenticati possono inserire log eventi
create policy "email_logs_select_admin" on public.email_logs for select using (public.is_admin());
create policy "email_logs_insert_auth" on public.email_logs for insert with check (auth.uid() is not null);

-- =============================================================================
-- STORAGE BUCKET PER RICEVUTE BONIFICI
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_upload_auth" on storage.objects
  for insert with check (bucket_id = 'receipts' and auth.uid() is not null);

create policy "receipts_select_auth" on storage.objects
  for select using (bucket_id = 'receipts' and auth.uid() is not null);
