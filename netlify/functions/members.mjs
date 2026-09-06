// Pour Decisions — member accounts API (Netlify Function + Netlify Blobs)
// Routes (all under /api/members/):
//   POST signup  {name,email,password,phone?,marketing?}  -> {token, member}
//   POST signin  {email,password}                          -> {token, member}
//   GET  me      (Authorization: Bearer <token>)           -> {member}
//   POST signout                                           -> {ok}
//   POST order   {items:[{name,qty}], total}               -> {member, order}   (recorded as unpaid; no points until Clover confirms)
//   POST profile {name?, phone?, marketing?}               -> {member}
import { getStore } from '@netlify/blobs';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_DAYS = 90;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const norm = (e) => String(e || '').trim().toLowerCase();
const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const hash = (pw, salt) => new Promise((res, rej) => scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k.toString('hex')))));
const pub = (m) => ({ name: m.name, email: m.email, phone: m.phone || '', marketing: !!m.marketing, points: m.points || 0, filled: m.filled || 0, orders: m.orders || [], created: m.created });

async function saveMember(store, m) {
  await store.setJSON('member:' + m.email, m);
  await store.setJSON('list:' + m.email, { email: m.email, name: m.name, phone: m.phone || '', marketing: !!m.marketing, created: m.created, points: m.points || 0, orders: (m.orders || []).length });
}
async function session(store, m) {
  const token = randomBytes(24).toString('hex');
  await store.setJSON('session:' + token, { email: m.email, exp: Date.now() + SESSION_DAYS * 864e5 });
  return json({ token, member: pub(m) });
}
async function auth(req, store) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const s = await store.get('session:' + token, { type: 'json' });
  if (!s || s.exp < Date.now()) return null;
  const m = await store.get('member:' + s.email, { type: 'json' });
  return m ? { m, token } : null;
}

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/members\/?/, '').replace(/\/$/, '');
  const store = getStore({ name: 'members', consistency: 'strong' });
  let body = {};
  if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }

  if (path === 'signup' && req.method === 'POST') {
    const email = norm(body.email), name = String(body.name || '').trim().slice(0, 80), pw = String(body.password || '');
    if (!okEmail(email)) return json({ error: 'Enter a valid email address.' }, 400);
    if (!name) return json({ error: 'Tell us your name.' }, 400);
    if (pw.length < 6) return json({ error: 'Password needs at least 6 characters.' }, 400);
    if (await store.get('member:' + email)) return json({ error: 'That email already has an account — sign in instead.' }, 409);
    const salt = randomBytes(16).toString('hex');
    const m = { name, email, phone: String(body.phone || '').slice(0, 30), marketing: body.marketing !== false, salt, hash: await hash(pw, salt), points: 0, filled: 0, orders: [], created: new Date().toISOString(), fails: 0 };
    await saveMember(store, m);
    return session(store, m);
  }
  if (path === 'signin' && req.method === 'POST') {
    const email = norm(body.email), pw = String(body.password || '');
    const m = await store.get('member:' + email, { type: 'json' });
    if (!m) return json({ error: 'No account with that email yet — create one below.', code: 'NO_ACCOUNT' }, 404);
    if (m.lockUntil && Date.now() < m.lockUntil) return json({ error: 'Too many tries. Wait 10 minutes and try again.' }, 429);
    const h = await hash(pw, m.salt);
    const ok = h.length === m.hash.length && timingSafeEqual(Buffer.from(h), Buffer.from(m.hash));
    if (!ok) {
      m.fails = (m.fails || 0) + 1;
      if (m.fails >= 5) { m.lockUntil = Date.now() + 10 * 60e3; m.fails = 0; }
      await store.setJSON('member:' + email, m);
      return json({ error: 'Wrong password.' }, 401);
    }
    m.fails = 0; delete m.lockUntil; await store.setJSON('member:' + email, m);
    return session(store, m);
  }

  const a = await auth(req, store);
  if (!a) return json({ error: 'Sign in required.' }, 401);

  if (path === 'me' && req.method === 'GET') return json({ member: pub(a.m) });
  if (path === 'signout' && req.method === 'POST') { await store.delete('session:' + a.token); return json({ ok: true }); }
  if (path === 'order' && req.method === 'POST') {
    const items = Array.isArray(body.items) ? body.items.slice(0, 40).map((i) => ({ name: String(i.name || '').slice(0, 80), qty: Math.max(1, Math.min(20, +i.qty || 1)) })) : [];
    const total = Math.round(Math.max(0, Math.min(1000, +body.total || 0)) * 100) / 100;
    // Recorded, not rewarded: points are granted only for paid orders (Clover confirmation, later step).
    const order = { id: Date.now(), date: new Date().toISOString().slice(0, 10), items, total, points: 0, status: 'unpaid' };
    a.m.orders = [order, ...(a.m.orders || [])].slice(0, 50);
    await saveMember(store, a.m);
    return json({ member: pub(a.m), order });
  }
  if (path === 'profile' && req.method === 'POST') {
    if (body.name) a.m.name = String(body.name).trim().slice(0, 80);
    if (body.phone !== undefined) a.m.phone = String(body.phone).slice(0, 30);
    if (body.marketing !== undefined) a.m.marketing = !!body.marketing;
    await saveMember(store, a.m);
    return json({ member: pub(a.m) });
  }
  return json({ error: 'Not found' }, 404);
};
export const config = { path: '/api/members/*' };
