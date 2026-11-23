// Supabase Edge Function: booking-cron
// Eseguibile giornalmente tramite Supabase Cron (pg_cron) o GitHub Actions (gratis).
// Invia email reali tramite Resend (piano gratuito: 3.000 email/mese).
// Variabili d'ambiente richieste su Supabase:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - RESEND_API_KEY (opzionale: se assente registra solo il log in email_logs)
// - FROM_EMAIL (es. "Carpfishing Gradoli <prenotazioni@carpfishingradoli.it>")

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('FROM_EMAIL') || 'Carpfishing Gradoli <onboarding@resend.dev>';
  if (!apiKey) return;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
  const X = Number(settings?.reminder_days_x ?? 2);
  const XY = X + Number(settings?.expire_extra_days_y ?? 2);

  const { data: pending } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'in_attesa_pagamento');

  let reminders = 0;
  let expired = 0;

  for (const b of pending || []) {
    const nextDays = (b.days_elapsed ?? 0) + 1;
    if (nextDays >= XY) {
      await supabase
        .from('bookings')
        .update({ status: 'scaduta', days_elapsed: nextDays })
        .eq('id', b.id);

      const subject = `Prenotazione #${b.id} SCADUTA e sbloccata automaticamente`;
      await sendEmail(
        b.user_email,
        subject,
        `<p>Ciao ${b.user_name}, la prenotazione <strong>#${b.id}</strong> (Piazzola ${b.peg_id}) è scaduta per mancato caricamento della ricevuta entro ${XY} giorni.</p>`,
      );
      await supabase.from('email_logs').insert({ recipient: b.user_email, subject });
      expired++;
    } else if (nextDays >= X && !b.reminder_sent) {
      await supabase
        .from('bookings')
        .update({ reminder_sent: true, days_elapsed: nextDays })
        .eq('id', b.id);

      const subject = `SOLLECITO: carica la ricevuta per #${b.id} entro ${XY - nextDays} gg`;
      await sendEmail(
        b.user_email,
        subject,
        `<p>Ciao ${b.user_name}, ricordati di caricare la ricevuta del bonifico per la prenotazione <strong>#${b.id}</strong> entro ${XY - nextDays} giorni.</p><p>Causale: <code>${b.causale}</code></p>`,
      );
      await supabase.from('email_logs').insert({ recipient: b.user_email, subject });
      reminders++;
    } else {
      await supabase.from('bookings').update({ days_elapsed: nextDays }).eq('id', b.id);
    }
  }

  return new Response(JSON.stringify({ ok: true, reminders, expired }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
