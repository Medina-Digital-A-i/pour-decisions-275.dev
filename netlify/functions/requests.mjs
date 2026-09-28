// Public intake for event-space booking and call-back requests from the site's forms.
// POST /api/requests {kind:'venue'|'callback', name, email?, phone?, date?, block?, guests?, eventType?, package?, topic?, bestTime?, notes?, company?}
// ("company" is a honeypot — real people never see it.) Saved for the owner dashboard and emailed/texted to the owners.
import { createRequest } from './lib/requests.mjs';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let b = {}; try { b = await req.json(); } catch {}
  if (b.company) return json({ ok: true }); // bot
  const r = await createRequest(b, { origin: new URL(req.url).origin, source: 'website form' });
  if (r.error) return json({ error: r.error }, 400);
  return json({ ok: true, reference: String(r.request.id).slice(-6) });
};
export const config = { path: '/api/requests' };
