// Lightweight first-party analytics (no cookies, no third party). The site POSTs one event per
// screen view: {screen, vid} where vid is a random anonymous id kept in the visitor's browser.
// Stored as one small blob per event in the "analytics" store; the owner dashboard aggregates.
import { getStore } from '@netlify/blobs';
const OK = new Set(['home','menu','pass','events','packages','gallery','venue','wheel','prizes','account','cart','checkout','confirm','detail','pina','auth']);
export default async (req) => {
  if (req.method !== 'POST') return new Response('', { status: 405 });
  let b = {}; try { b = await req.json(); } catch {}
  const screen = OK.has(b.screen) ? b.screen : 'other';
  const vid = /^[a-z0-9]{6,32}$/i.test(b.vid || '') ? b.vid : 'anon';
  const d = new Date(), day = d.toISOString().slice(0, 10);
  const st = getStore({ name: 'analytics', consistency: 'eventual' });
  await st.setJSON(`pv:${day}:${d.getTime()}-${Math.random().toString(36).slice(2, 7)}`, { s: screen, v: vid, t: d.getTime(), m: !!b.mobile });
  return new Response('', { status: 204 });
};
export const config = { path: '/api/track' };
