/* Pour Decisions — tiny persistence layer.
 *
 * Talks to a Redis store via the `REDIS_URL` connection string that Vercel
 * injects when you attach an Upstash/Redis database to the project. Also accepts
 * KV_URL / REDIS_TLS_URL as aliases. Uses ioredis (a single pooled client reused
 * across warm serverless invocations).
 *
 * When no Redis URL is configured, helpers report `configured:false` and the
 * front-end falls back to on-device storage, so nothing breaks.
 */

import Redis from 'ioredis';

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.REDIS_TLS_URL ||
  process.env.KV_URL ||
  null;

export const kvConfigured = () => Boolean(REDIS_URL);

let _client = null;
function client() {
  if (!_client) {
    _client = new Redis(REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      // Upstash and most managed Redis use TLS (rediss://); ioredis reads that
      // from the URL scheme. Keep the connection alive across warm invocations.
      keepAlive: 10000,
    });
    _client.on('error', (e) => console.error('Redis error', e && e.message));
  }
  return _client;
}

/** Read a JSON array stored under `key`. Returns [] if missing. */
export async function readList(key) {
  const raw = await client().get(key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

/** Overwrite the JSON array stored under `key`. */
export async function writeList(key, list) {
  await client().set(key, JSON.stringify(list));
}

/* ── Generic key helpers (used by auth: codes + sessions) ── */
export async function kvSet(key, value, ttlSec) {
  if (ttlSec) return client().set(key, String(value), 'EX', ttlSec);
  return client().set(key, String(value));
}
export async function kvGet(key) { return client().get(key); }
export async function kvDel(key) { return client().del(key); }

/** Resolve the signed-in phone from an `x-session` token, or null. */
export async function getSessionPhone(req) {
  if (!kvConfigured()) return null;
  const token = (req.headers && req.headers['x-session']) || '';
  if (!token) return null;
  try { return (await kvGet(`pd:session:${token}`)) || null; } catch { return null; }
}

/** Shared admin PIN check. Defaults to 7687 ("POUR") until ADMIN_PIN is set. */
export function checkPin(req) {
  const expected = process.env.ADMIN_PIN || '7687';
  const got = req.headers['x-admin-pin'] || '';
  return String(got) === String(expected);
}

export function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/* ───────────────────────── CUSTOMERS / LOYALTY ─────────────────────────
 * Customers are the single source of truth for Pour Pass stars. They're
 * keyed by phone number (digits only). A full card is 9 stamps; the 10th
 * pour is free, so reaching 9 rolls over into one banked reward.
 */
export const CUSTOMERS_KEY = 'pd:customers';
const STAMPS_PER_REWARD = 9;

export const normPhone = (p) => String(p || '').replace(/\D/g, '');

function blankCustomer(phone, name) {
  return {
    phone, name: name || '',
    stars: 0, rewards: 0, lifetime: 0, spent: 0,
    createdAt: new Date().toISOString(), lastVisit: null,
  };
}

/** Roll a stamp total into stars (0..8) + banked rewards, never negative. */
function rollStars(c) {
  while (c.stars >= STAMPS_PER_REWARD) { c.stars -= STAMPS_PER_REWARD; c.rewards += 1; }
  while (c.stars < 0) {
    if (c.rewards > 0) { c.rewards -= 1; c.stars += STAMPS_PER_REWARD; }
    else { c.stars = 0; break; }
  }
  return c;
}

export async function getCustomer(phone) {
  const list = await readList(CUSTOMERS_KEY);
  return list.find((x) => x.phone === normPhone(phone)) || null;
}

/** Award one stamp (a purchase) and update lifetime/spend totals. */
export async function awardStamp(phone, name, amount = 0) {
  const ph = normPhone(phone);
  const list = await readList(CUSTOMERS_KEY);
  let c = list.find((x) => x.phone === ph);
  if (!c) { c = blankCustomer(ph, name); list.unshift(c); }
  if (name) c.name = name;
  c.stars += 1; c.lifetime += 1; c.spent += Number(amount) || 0;
  c.lastVisit = new Date().toISOString();
  rollStars(c);
  await writeList(CUSTOMERS_KEY, list);
  return c;
}

/** Owner-driven star change (+1 cash sale, -1 correction, etc). */
export async function adjustStamps(phone, delta, name) {
  const ph = normPhone(phone);
  const list = await readList(CUSTOMERS_KEY);
  let c = list.find((x) => x.phone === ph);
  if (!c) { c = blankCustomer(ph, name); list.unshift(c); }
  if (name) c.name = name;
  c.stars += Number(delta) || 0;
  c.lastVisit = new Date().toISOString();
  rollStars(c);
  await writeList(CUSTOMERS_KEY, list);
  return c;
}
