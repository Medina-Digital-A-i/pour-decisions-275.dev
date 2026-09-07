// Owner dashboard API — requires a signed-in member whose email is in OWNER_EMAILS (Netlify env var).
//   GET /api/admin/overview            -> KPIs, signups/day, traffic/day, top screens, top items, recent members & orders
//   GET /api/admin/members?q=          -> member list (search by name/email/phone)
//   GET /api/admin/member?email=       -> full profile incl. orders + prizes
//   GET  /api/admin/orders             -> every order request, newest first, + unpaid count
//   POST /api/admin/order              -> {email, orderId, status:'paid'|'unpaid'|'cancelled'}  (paid = award points + Pour Pass stamps)
//   POST /api/admin/prize              -> {email, prizeId, claimed:true|false}  (staff marks a prize redeemed)
//   GET /api/admin/members.csv         -> CSV export (owner session, or Authorization: Bearer <ADMIN_TOKEN>)
import { getStore } from '@netlify/blobs';
import { timingSafeEqual, scrypt, randomBytes } from 'node:crypto';
const hash = (pw, salt) => new Promise((res, rej) => scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k.toString('hex')))));
import { auth, store, isOwner, pub, saveMember, loadMenu, rewardRules, settleOrder } from './members.mjs';

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
async function listAll(st, prefix) {
  const out = []; let cursor;
  do { const page = await st.list({ prefix, cursor }); out.push(...page.blobs.map((b) => b.key)); cursor = page.cursor; } while (cursor);
  return out;
}
async function ownerOk(req, st) {
  const a = await auth(req, st);
  if (a && isOwner(a.m.email)) return a;
  const want = process.env.ADMIN_TOKEN || '', got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (want.length >= 24 && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want))) return { token: true };
  return null;
}
const dayKeys = (n) => { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setUTCDate(d.getUTCDate() - i); out.push(d.toISOString().slice(0, 10)); } return out; };

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/admin\/?/, '').replace(/\/$/, '');
  const st = store();
  const who = await ownerOk(req, st);
  if (!who) return json({ error: 'Owners only.' }, 403);

  if (path === 'overview') {
    const keys = await listAll(st, 'list:');
    const members = (await Promise.all(keys.map((k) => st.get(k, { type: 'json' })))).filter(Boolean);
    const days = dayKeys(30);
    const signups = Object.fromEntries(days.map((d) => [d, 0]));
    for (const m of members) { const d = (m.created || '').slice(0, 10); if (d in signups) signups[d]++; }
    // orders: pull from full member records (recent 200 members max for speed)
    const full = (await Promise.all(members.slice(0, 200).map((m) => st.get('member:' + m.email, { type: 'json' })))).filter(Boolean);
    const orders = full.flatMap((m) => (m.orders || []).map((o) => ({ ...o, name: m.name, email: m.email }))).sort((a, b) => b.id - a.id);
    const items = {}; for (const o of orders) for (const it of o.items || []) items[it.name] = (items[it.name] || 0) + (it.qty || 1);
    const topItems = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => ({ name, qty }));
    // traffic
    const an = getStore({ name: 'analytics', consistency: 'eventual' });
    const traffic = Object.fromEntries(days.map((d) => [d, { views: 0, visitors: 0 }]));
    const screens = {}; let mobile = 0, total = 0;
    for (const d of days) {
      const ks = await listAll(an, `pv:${d}:`);
      if (!ks.length) continue;
      const evs = (await Promise.all(ks.slice(0, 2000).map((k) => an.get(k, { type: 'json' })))).filter(Boolean);
      const vids = new Set();
      for (const e of evs) { vids.add(e.v); screens[e.s] = (screens[e.s] || 0) + 1; if (e.m) mobile++; total++; }
      traffic[d] = { views: evs.length, visitors: vids.size };
    }
    const prizes = full.flatMap((m) => (m.prizes || []).map((p) => ({ ...p, name: m.name, email: m.email }))).sort((a, b) => b.id - a.id);
    return json({
      kpis: {
        members: members.length,
        optIn: members.filter((m) => m.marketing).length,
        newThisWeek: members.filter((m) => Date.now() - Date.parse(m.created) < 7 * 864e5).length,
        newThisMonth: members.filter((m) => (m.created || '').slice(0, 7) === new Date().toISOString().slice(0, 7)).length,
        orders: orders.length, paidOrders: orders.filter((o) => o.status === 'paid').length,
        revenue: Math.round(orders.filter((o) => o.status === 'paid').reduce((a, o) => a + o.total, 0) * 100) / 100,
        requested: Math.round(orders.reduce((a, o) => a + o.total, 0) * 100) / 100,
        views30: total, mobileShare: total ? Math.round((mobile / total) * 100) : 0,
        openPrizes: prizes.filter((p) => !p.claimed).length,
      },
      signups, traffic, topScreens: Object.entries(screens).sort((a, b) => b[1] - a[1]).map(([screen, views]) => ({ screen, views })), topItems,
      recentMembers: members.sort((a, b) => (a.created < b.created ? 1 : -1)).slice(0, 12),
      recentOrders: orders.slice(0, 15), recentPrizes: prizes.slice(0, 15),
      birthdaysThisMonth: members.filter((m) => m.birthday && m.birthday.slice(0, 2) === String(new Date().getMonth() + 1).padStart(2, '0')).map((m) => ({ name: m.name, email: m.email, birthday: m.birthday })),
    });
  }
  if (path === 'members') {
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();
    const keys = await listAll(st, 'list:');
    let members = (await Promise.all(keys.map((k) => st.get(k, { type: 'json' })))).filter(Boolean);
    if (q) members = members.filter((m) => [m.name, m.email, m.phone].join(' ').toLowerCase().includes(q));
    members.sort((a, b) => (a.created < b.created ? 1 : -1));
    return json({ members: members.slice(0, 500), total: members.length });
  }
  if (path === 'member') {
    const email = (url.searchParams.get('email') || '').toLowerCase().trim();
    const m = await st.get('member:' + email, { type: 'json' });
    if (!m) return json({ error: 'Not found' }, 404);
    return json({ member: pub(m) });
  }
  if (path === 'orders') {
    const keys = await listAll(st, 'list:');
    const light = (await Promise.all(keys.map((k) => st.get(k, { type: 'json' })))).filter(Boolean).filter((m) => m.orders > 0);
    const full = (await Promise.all(light.map((m) => st.get('member:' + m.email, { type: 'json' })))).filter(Boolean);
    const orders = full.flatMap((m) => (m.orders || []).map((o) => ({ ...o, name: m.name, email: m.email, phone: m.phone || '' }))).sort((a, b) => b.id - a.id);
    return json({ orders: orders.slice(0, 300), unpaid: orders.filter((o) => (o.status || 'unpaid') === 'unpaid').length });
  }
  if (path === 'order' && req.method === 'POST') {
    let b = {}; try { b = await req.json(); } catch {}
    const m = await st.get('member:' + String(b.email || '').toLowerCase(), { type: 'json' });
    if (!m) return json({ error: 'Not found' }, 404);
    const o = (m.orders || []).find((x) => x.id === +b.orderId);
    if (!o) return json({ error: 'Order not found' }, 404);
    const status = ['paid', 'unpaid', 'cancelled'].includes(b.status) ? b.status : 'paid';
    settleOrder(m, o, rewardRules(await loadMenu(req)), status);
    await saveMember(st, m);
    return json({ member: pub(m), order: o });
  }
  if (path === 'prize' && req.method === 'POST') {
    let b = {}; try { b = await req.json(); } catch {}
    const m = await st.get('member:' + String(b.email || '').toLowerCase(), { type: 'json' });
    if (!m) return json({ error: 'Not found' }, 404);
    m.prizes = (m.prizes || []).map((p) => (p.id === +b.prizeId ? { ...p, claimed: !!b.claimed, claimedAt: b.claimed ? new Date().toISOString() : undefined } : p));
    await saveMember(st, m);
    return json({ member: pub(m) });
  }
  if (path === 'reset' && req.method === 'POST') {
    // Counter reset: staff hands the customer a temporary password; the app asks them to change it.
    let b = {}; try { b = await req.json(); } catch {}
    const email = String(b.email || '').toLowerCase().trim();
    const m = await st.get('member:' + email, { type: 'json' });
    if (!m) return json({ error: 'Not found' }, 404);
    const temp = 'pour-' + String(Math.floor(1000 + Math.random() * 9000));
    m.salt = randomBytes(16).toString('hex'); m.hash = await hash(temp, m.salt); m.mustChange = true; m.fails = 0; delete m.lockUntil;
    await saveMember(st, m);
    return json({ temp });
  }
  if (path === 'events') {
    const ev = getStore({ name: 'content', consistency: 'strong' });
    let events = (await ev.get('events', { type: 'json' })) || [];
    if (req.method === 'GET') return json({ events: events.sort((a, b) => (a.date < b.date ? -1 : 1)) });
    let b = {}; try { b = await req.json(); } catch {}
    if (b.delete) { events = events.filter(e => String(e.id) !== String(b.id)); await ev.setJSON('events', events); return json({ events }); }
    const clean = { kind: ['popup','workshop','tasting','wellness','party','live','other'].includes(b.kind) ? b.kind : 'other', title: String(b.title || '').trim().slice(0, 120), date: String(b.date || '').slice(0, 10), time: String(b.time || '').slice(0, 40), desc: String(b.desc || '').slice(0, 600), price: Math.max(0, +b.price || 0), link: String(b.link || '').slice(0, 300), hidden: !!b.hidden };
    if (!clean.title || !/^\d{4}-\d{2}-\d{2}$/.test(clean.date)) return json({ error: 'Title and a date (YYYY-MM-DD) are required.' }, 400);
    if (clean.link && !/^https?:\/\//.test(clean.link)) return json({ error: 'Link must start with http:// or https://' }, 400);
    if (b.id) { const i = events.findIndex(e => String(e.id) === String(b.id)); if (i < 0) return json({ error: 'Not found' }, 404); events[i] = { ...events[i], ...clean }; }
    else events.push({ id: Date.now(), ...clean, rsvps: 0, guests: [], created: new Date().toISOString() });
    await ev.setJSON('events', events);
    return json({ events: events.sort((a, b) => (a.date < b.date ? -1 : 1)) });
  }
  if (path === 'purge-test' && req.method === 'POST') {
    // removes accounts on the internal test domain only
    const keys = (await listAll(st, 'list:')).filter(k => k.endsWith('@pourdecisions.test'));
    for (const k of keys) { const email = k.slice(5); await st.delete('list:' + email); await st.delete('member:' + email); }
    return json({ removed: keys.length });
  }
  if (path === 'members.csv') {
    const keys = await listAll(st, 'list:');
    const rows = (await Promise.all(keys.map((k) => st.get(k, { type: 'json' })))).filter(Boolean).sort((a, b) => (a.created < b.created ? 1 : -1));
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = ['email,name,phone,marketing_opt_in,birthday,joined,points,orders,spent,last_order']
      .concat(rows.map((r) => [r.email, r.name, r.phone, r.marketing ? 'yes' : 'no', r.birthday, r.created, r.points, r.orders, r.spent, r.lastOrder].map(esc).join(','))).join('\n');
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="pour-decisions-members.csv"', 'cache-control': 'no-store' } });
  }
  return json({ error: 'Not found' }, 404);
};
export const config = { path: '/api/admin/*' };
