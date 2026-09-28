// Customer requests — event-space bookings and call-backs — kept in Netlify Blobs ("requests" store)
// so the owner dashboard can list them and Piña can check which dates are already taken.
// Keys: req:<id> -> full request. Status: new -> contacted -> confirmed | declined.
import { getStore } from '@netlify/blobs';
import { notifyOwners, textOwners, emailCustomer, sendSms } from './notify.mjs';

export const reqStore = () => getStore({ name: 'requests', consistency: 'strong' });
export const BLOCKS = { morning: 'Morning (9am–12pm)', afternoon: 'Afternoon (1pm–5pm)', evening: 'Evening (6pm–9pm)', flexible: 'Flexible' };
export const STATUSES = ['new', 'contacted', 'confirmed', 'declined'];
const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const okPhone = (p) => String(p || '').replace(/\D/g, '').length >= 10;
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

export async function listRequests(st = reqStore()) {
  const out = []; let cursor;
  do { const page = await st.list({ prefix: 'req:', cursor }); out.push(...page.blobs.map((b) => b.key)); cursor = page.cursor; } while (cursor);
  const all = (await Promise.all(out.map((k) => st.get(k, { type: 'json' })))).filter(Boolean);
  return all.sort((a, b) => b.id - a.id);
}

// Validates and saves a request, then alerts the owners (email + text when configured).
// Returns {request} or {error}.
export async function createRequest(input, { origin, source = 'site' } = {}) {
  const kind = input.kind === 'callback' ? 'callback' : 'venue';
  const r = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000), kind, status: 'new', source,
    created: new Date().toISOString(),
    name: clip(input.name, 80), email: clip(input.email, 120).toLowerCase(), phone: clip(input.phone, 30),
    notes: clip(input.notes, 800),
  };
  if (!r.name) return { error: 'A name is required.' };
  if (kind === 'callback') {
    if (!okPhone(r.phone)) return { error: 'A phone number (10 digits) is required for a call back.' };
    r.topic = clip(input.topic, 200); r.bestTime = clip(input.bestTime, 80);
  } else {
    if (!okEmail(r.email) && !okPhone(r.phone)) return { error: 'An email or phone number is required.' };
    r.date = clip(input.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return { error: 'The date should look like YYYY-MM-DD.' };
    if (r.date < today()) return { error: 'That date has already passed.' };
    r.block = BLOCKS[input.block] ? input.block : 'flexible';
    r.guests = clip(input.guests, 20); r.eventType = clip(input.eventType, 60); r.package = clip(input.package, 60);
  }
  const st = reqStore();
  await st.setJSON('req:' + r.id, r);
  const who = `${r.name}${r.phone ? ' · ' + r.phone : ''}${r.email ? ' · ' + r.email : ''}`;
  const subject = kind === 'callback' ? `Call-back request: ${r.name}` : `Event space request: ${r.date} — ${r.name}`;
  const text = kind === 'callback'
    ? `${who}\nAbout: ${r.topic || '—'}\nBest time: ${r.bestTime || 'any'}\n${r.notes ? '\n' + r.notes + '\n' : ''}\nFrom: ${source}`
    : `${who}\nDate: ${r.date} · ${BLOCKS[r.block]}\nGuests: ${r.guests || '—'} · Type: ${r.eventType || '—'} · Package: ${r.package || '—'}\n${r.notes ? '\n' + r.notes + '\n' : ''}\nFrom: ${source}`;
  const dash = `${process.env.URL || origin || ''}/admin.html#requests`;
  await Promise.allSettled([
    notifyOwners({ origin, subject, text: text + `\n\nDashboard: ${dash}` }),
    textOwners(kind === 'callback' ? `Pour Decisions: call back ${r.name} ${r.phone}${r.topic ? ' — ' + r.topic : ''}` : `Pour Decisions: space request ${r.date} ${BLOCKS[r.block]} — ${r.name} ${r.phone || r.email}`),
    // let the customer know it landed (email via the shop Gmail, text via Twilio — each only when configured)
    kind === 'venue' && r.email ? emailCustomer({ to: r.email, subject: 'We got your Pour Decisions event request',
      text: `Hi ${r.name.split(' ')[0]},\n\nThanks for asking about the space for ${r.date} (${BLOCKS[r.block]}). We'll get back to you with availability and a quote, usually within a day.\n\nQuestions? Call or text (838) 261-9233.\n\nPour Decisions\n359 Northern Blvd, Albany NY` }) : null,
    r.phone ? sendSms(r.phone, kind === 'callback' ? `Pour Decisions: got it, ${r.name.split(' ')[0]} — we'll call you back during shop hours (Mon–Sat 8–5).` : `Pour Decisions: got your space request for ${r.date}. We'll reply with availability and a quote soon.`) : null,
  ]);
  return { request: r };
}

// What's already on the calendar for a date: confirmed or pending space requests, plus shop events.
export async function dayAvailability(date) {
  const reqs = (await listRequests()).filter((r) => r.kind === 'venue' && r.date === date && r.status !== 'declined');
  const events = ((await getStore({ name: 'content', consistency: 'strong' }).get('events', { type: 'json' })) || [])
    .filter((e) => e.date === date && !e.hidden).map((e) => ({ title: e.title, time: e.time || '' }));
  const taken = {};
  for (const r of reqs) {
    const k = r.block || 'flexible';
    taken[k] = taken[k] === 'booked' || r.status === 'confirmed' ? 'booked' : 'requested';
  }
  const dow = new Date(date + 'T12:00:00Z').getUTCDay();
  return { date, closedDay: dow === 0, blocks: Object.fromEntries(Object.keys(BLOCKS).filter((k) => k !== 'flexible').map((k) => [k, taken[k] || (taken.flexible ? 'requested' : 'open')])), events };
}
