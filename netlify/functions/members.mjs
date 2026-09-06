// Pour Decisions — member accounts API (Netlify Function + Netlify Blobs)
// Routes under /api/members/:
//   POST signup  {name,email,password,phone?,marketing?,birthday?} -> {token, member}   (emails the owners)
//   POST signin  {email,password}                                   -> {token, member}
//   GET  me                                                         -> {member}
//   POST signout                                                    -> {ok}
//   POST order   {items:[{name,qty}], total}                        -> {member, order}  (recorded as unpaid; points only when paid)
//   POST profile {name?, phone?, marketing?, birthday?}             -> {member}
//   POST spin                                                       -> {index, prize, member}  (one spin per calendar month, prizes from menu.json "wheel")
//   POST claim   {prizeId}                                          -> {member}          (member marks a prize used; staff verify by code)
import { getStore } from '@netlify/blobs';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { notifyOwners } from './lib/notify.mjs';

const SESSION_DAYS = 90;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const norm = (e) => String(e || '').trim().toLowerCase();
const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const hash = (pw, salt) => new Promise((res, rej) => scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k.toString('hex')))));
const monthKey = (d = new Date()) => d.toISOString().slice(0, 7);
const owners = () => String(process.env.OWNER_EMAILS || '').split(/[,\s]+/).map(norm).filter(Boolean);
export const isOwner = (email) => owners().includes(norm(email));
export const store = () => getStore({ name: 'members', consistency: 'strong' });

export const pub = (m) => ({
  name: m.name, email: m.email, phone: m.phone || '', marketing: !!m.marketing, birthday: m.birthday || '',
  points: m.points || 0, filled: m.filled || 0, orders: m.orders || [], prizes: m.prizes || [],
  lastSpinMonth: m.lastSpinMonth || '', canSpin: (m.lastSpinMonth || '') !== monthKey(),
  role: isOwner(m.email) ? 'owner' : 'member', created: m.created,
});
export async function saveMember(st, m) {
  await st.setJSON('member:' + m.email, m);
  await st.setJSON('list:' + m.email, {
    email: m.email, name: m.name, phone: m.phone || '', marketing: !!m.marketing, birthday: m.birthday || '', created: m.created,
    points: m.points || 0, orders: (m.orders || []).length, spent: Math.round((m.orders || []).reduce((a, o) => a + (o.status === 'paid' ? o.total : 0), 0) * 100) / 100,
    lastOrder: (m.orders || [])[0]?.date || '', lastSpinMonth: m.lastSpinMonth || '', prizes: (m.prizes || []).length,
  });
}
async function session(st, m) {
  const token = randomBytes(24).toString('hex');
  await st.setJSON('session:' + token, { email: m.email, exp: Date.now() + SESSION_DAYS * 864e5 });
  return json({ token, member: pub(m) });
}
export async function auth(req, st) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const s = await st.get('session:' + token, { type: 'json' });
  if (!s || s.exp < Date.now()) return null;
  const m = await st.get('member:' + s.email, { type: 'json' });
  return m ? { m, token } : null;
}
async function loadWheel(req) {
  const base = new URL(req.url).origin;
  try {
    const r = await fetch(base + '/menu.json', { cache: 'no-store' });
    const menu = await r.json();
    if (Array.isArray(menu.wheel) && menu.wheel.length) return menu.wheel;
  } catch {}
  return [{ id: 'try-again', label: 'Not this time', weight: 1 }];
}
const code = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
const okBirthday = (b) => !b || /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(b); // MM-DD, no year needed

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/members\/?/, '').replace(/\/$/, '');
  const st = store();
  let body = {};
  if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }

  if (path === 'notify-status') {
    const env = { GMAIL_USER: !!process.env.GMAIL_USER, GMAIL_APP_PASSWORD: !!process.env.GMAIL_APP_PASSWORD, NOTIFY_TO: !!process.env.NOTIFY_TO, OWNER_EMAILS: !!process.env.OWNER_EMAILS };
    if (req.method === 'POST') {
      try { const r = await notifyOwners({ origin: url.origin, subject: 'Test alert — email is working', text: 'This is the test alert from the Pour Decisions site. New-member emails will look like this.\n\nSent ' + new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }) }); return json({ env, result: r }); }
      catch (e) { return json({ env, error: String(e && e.message || e).slice(0, 300) }, 500); }
    }
    return json({ env });
  }
  if (path === 'signup' && req.method === 'POST') {
    const email = norm(body.email), name = String(body.name || '').trim().slice(0, 80), pw = String(body.password || '');
    if (!okEmail(email)) return json({ error: 'Enter a valid email address.' }, 400);
    if (!name) return json({ error: 'Tell us your name.' }, 400);
    if (pw.length < 6) return json({ error: 'Password needs at least 6 characters.' }, 400);
    if (!okBirthday(body.birthday)) return json({ error: 'Birthday should look like MM-DD.' }, 400);
    if (await st.get('member:' + email)) return json({ error: 'That email already has an account — sign in instead.' }, 409);
    const salt = randomBytes(16).toString('hex');
    const m = { name, email, phone: String(body.phone || '').slice(0, 30), marketing: body.marketing !== false, birthday: body.birthday || '', salt, hash: await hash(pw, salt), points: 0, filled: 0, orders: [], prizes: [], created: new Date().toISOString(), fails: 0 };
    await saveMember(st, m);
    notifyOwners({
      origin: url.origin,
      subject: `New Pour Pass member: ${name}`,
      text: `${name} just created an account.\n\nEmail: ${email}\nPhone: ${m.phone || '—'}\nDeals opt-in: ${m.marketing ? 'yes' : 'no'}\nBirthday: ${m.birthday || '—'}\nWhen: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}\n\nOwner dashboard: ${process.env.URL || ''}/admin.html`,
    }).catch(() => {});
    return session(st, m);
  }
  if (path === 'signin' && req.method === 'POST') {
    const email = norm(body.email), pw = String(body.password || '');
    const m = await st.get('member:' + email, { type: 'json' });
    if (!m) return json({ error: 'No account with that email yet — create one below.', code: 'NO_ACCOUNT' }, 404);
    if (m.lockUntil && Date.now() < m.lockUntil) return json({ error: 'Too many tries. Wait 10 minutes and try again.' }, 429);
    const h = await hash(pw, m.salt);
    const ok = h.length === m.hash.length && timingSafeEqual(Buffer.from(h), Buffer.from(m.hash));
    if (!ok) {
      m.fails = (m.fails || 0) + 1;
      if (m.fails >= 5) { m.lockUntil = Date.now() + 10 * 60e3; m.fails = 0; }
      await st.setJSON('member:' + email, m);
      return json({ error: 'Wrong password.' }, 401);
    }
    m.fails = 0; delete m.lockUntil; await st.setJSON('member:' + email, m);
    return session(st, m);
  }

  const a = await auth(req, st);
  if (!a) return json({ error: 'Sign in required.' }, 401);
  const m = a.m;

  if (path === 'me' && req.method === 'GET') return json({ member: pub(m) });
  if (path === 'signout' && req.method === 'POST') { await st.delete('session:' + a.token); return json({ ok: true }); }
  if (path === 'order' && req.method === 'POST') {
    const items = Array.isArray(body.items) ? body.items.slice(0, 40).map((i) => ({ name: String(i.name || '').slice(0, 80), qty: Math.max(1, Math.min(20, +i.qty || 1)) })) : [];
    const total = Math.round(Math.max(0, Math.min(1000, +body.total || 0)) * 100) / 100;
    // Recorded, not rewarded: points are granted only when an order is paid (Clover confirmation, later step).
    const order = { id: Date.now(), date: new Date().toISOString().slice(0, 10), items, total, points: 0, status: 'unpaid' };
    m.orders = [order, ...(m.orders || [])].slice(0, 100);
    await saveMember(st, m);
    if (process.env.NOTIFY_ORDERS === '1') notifyOwners({ origin: url.origin, subject: `Order request from ${m.name} — $${total.toFixed(2)}`, text: items.map((i) => `${i.qty} × ${i.name}`).join('\n') + `\n\nTotal $${total.toFixed(2)} (pay at pickup)\n${m.name} · ${m.email} · ${m.phone || ''}` }).catch(() => {});
    return json({ member: pub(m), order });
  }
  if (path === 'profile' && req.method === 'POST') {
    if (body.name) m.name = String(body.name).trim().slice(0, 80);
    if (body.phone !== undefined) m.phone = String(body.phone).slice(0, 30);
    if (body.marketing !== undefined) m.marketing = !!body.marketing;
    if (body.birthday !== undefined && okBirthday(body.birthday)) m.birthday = body.birthday || '';
    await saveMember(st, m);
    return json({ member: pub(m) });
  }
  if (path === 'spin' && req.method === 'POST') {
    const now = monthKey();
    if ((m.lastSpinMonth || '') === now) {
      const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 1, 1);
      return json({ error: 'You already spun this month. Next spin ' + next.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + '.', code: 'ALREADY_SPUN', nextSpin: next.toISOString().slice(0, 10) }, 429);
    }
    const wheel = await loadWheel(req);
    const total = wheel.reduce((s, w) => s + Math.max(0, +w.weight || 0), 0) || 1;
    let r = Math.random() * total, index = wheel.length - 1;
    for (let i = 0; i < wheel.length; i++) { r -= Math.max(0, +wheel[i].weight || 0); if (r < 0) { index = i; break; } }
    const w = wheel[index];
    const win = w.id !== 'try-again' && !/^not this time$/i.test(w.label || '');
    const exp = new Date(); exp.setDate(exp.getDate() + 30);
    const prize = win ? { id: Date.now(), code: code(), label: w.label, itemId: w.itemId || '', wonDate: new Date().toISOString().slice(0, 10), expires: exp.toISOString().slice(0, 10), claimed: false } : null;
    m.lastSpinMonth = now;
    if (prize) m.prizes = [prize, ...(m.prizes || [])].slice(0, 50);
    if (win && /^\+(\d+) points$/i.test(w.label)) m.points = (m.points || 0) + +w.label.match(/\d+/)[0];
    await saveMember(st, m);
    return json({ index, win, prize, member: pub(m) });
  }
  if (path === 'claim' && req.method === 'POST') {
    m.prizes = (m.prizes || []).map((p) => (p.id === +body.prizeId ? { ...p, claimed: true, claimedAt: new Date().toISOString() } : p));
    await saveMember(st, m);
    return json({ member: pub(m) });
  }
  return json({ error: 'Not found' }, 404);
};
export const config = { path: '/api/members/*' };
