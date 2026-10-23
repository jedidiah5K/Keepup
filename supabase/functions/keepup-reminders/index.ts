// Sends KeepUp reminders as push notifications. A scheduled job in the database calls this every
// 5 minutes. keepup_due_reminders() decides what's due (and marks it sent, so calling this twice
// never sends twice); this just delivers it to each phone that turned notifications on.
// Needs the secrets VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (Edge Functions → Secrets).
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
webpush.setVapidDetails('https://keepup-nine.vercel.app', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

Deno.serve(async () => {
  const { data: due, error } = await db.rpc('keepup_due_reminders');
  if (error) return new Response(error.message, { status: 500 });
  if (Math.random() < 0.01) await db.rpc('keepup_push_sent_tidy');
  if (!due?.length) return Response.json({ sent: 0 });

  const { data: phones } = await db.from('keepup_push_tokens').select('id, user_id, token, keys')
    .eq('kind', 'webpush').in('user_id', [...new Set(due.map(r => r.user_id))]);
  let sent = 0; const gone: number[] = [];
  await Promise.all(due.flatMap(r => (phones || []).filter(p => p.user_id === r.user_id).map(async p => {
    try {
      await webpush.sendNotification({ endpoint: p.token, keys: p.keys },
        JSON.stringify({ title: r.title, body: r.body, tag: r.tag, url: '/' }), { TTL: 60 * 60, urgency: 'normal' });
      sent++;
    } catch (e) {
      // 404/410: the phone turned notifications off or the app was removed, so forget it.
      if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(p.id);
      else console.error('push failed', e?.statusCode, e?.body);
    }
  })));
  if (gone.length) await db.from('keepup_push_tokens').delete().in('id', gone);
  return Response.json({ sent, gone: gone.length });
});
