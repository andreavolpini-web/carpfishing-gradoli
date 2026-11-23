// Supabase Edge Function: send-email
// Invia email reali (nuove prenotazioni, disdette, conferme, notifiche Admin) tramite Resend (gratis fino a 3.000/mese).
// Variabili d'ambiente su Supabase:
// - RESEND_API_KEY
// - FROM_EMAIL (es. "Carpfishing Gradoli <prenotazioni@carpfishingradoli.it>")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('FROM_EMAIL') || 'Carpfishing Gradoli <onboarding@resend.dev>';

    if (!apiKey) {
      return new Response(JSON.stringify({ ok: true, skipped: 'RESEND_API_KEY non configurata' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: html || `<p>${subject}</p>`,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, data }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
