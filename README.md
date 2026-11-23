# Carpfishing Gradoli — App Web (PWA), Android & iOS

Applicazione di prenotazione postazioni per **Carpfishing Gradoli (Lago di Bolsena)** realizzata con un'unica base di codice (**React + TypeScript + Vite + PWA + Capacitor + Supabase**), progettata per funzionare a **costo zero (€0/mese)**.

## Architettura a costo zero (€0/mese)

| Componente | Servizio consigliato | Piano Gratuito |
|---|---|---|
| **Hosting Web + PWA** | Vercel / Netlify / Cloudflare Pages | Illimitato per traffico standard |
| **Database + Auth + Storage ricevute** | [Supabase](https://supabase.com) | 500 MB PostgreSQL, 1 GB Storage, 50.000 utenti/mese |
| **Email automatiche** | [Resend](https://resend.com) | 3.000 email/mese gratis |
| **App Mobile (senza store)** | **PWA installabile** da Chrome (Android) e Safari (iOS) | **€0** |
| **App Mobile sugli Store (opzionale)** | **Capacitor** (già configurato) | Google Play: \$25 una tantum · Apple App Store: \$99/anno |

---

## Avvio rapido in locale

```bash
npm install
npm run dev
```

Se `.env` non è configurato, l'app si avvia automaticamente in **Modalità Locale** (salvataggio su `localStorage`) con due account di test pronti:
- **Utente:** `marco.rossi@email.it` / `password123`
- **Admin:** `admin@carpfishingradoli.it` / `admin123`

---

## Collegare Supabase (Backend reale gratuito)

1. Crea un progetto gratuito su [supabase.com](https://supabase.com).
2. Apri **SQL Editor** e incolla ed esegui il file `supabase/schema.sql`.
3. Copia `.env.example` in `.env` e inserisci `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Per promuovere un utente ad **Admin**, esegui nell'SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'tua-email@esempio.it';
   ```
5. (Opzionale) Distribuisci `supabase/functions/booking-cron/index.ts` su Supabase Edge Functions e imposta `RESEND_API_KEY` per inviare solleciti e scadenze automatiche ogni giorno.

---

## Generare l'app nativa Android / iOS (Capacitor)

```bash
# 1. Aggiungi la piattaforma Android (richiede Android Studio per compilare l'APK/AAB)
npm install @capacitor/android
npx cap add android

# 2. Compila e sincronizza il progetto web dentro Android
npm run cap:sync
npm run cap:android
```

Per iOS (richiede macOS + Xcode):
```bash
npm install @capacitor/ios
npx cap add ios
npm run cap:sync
npm run cap:ios
```
