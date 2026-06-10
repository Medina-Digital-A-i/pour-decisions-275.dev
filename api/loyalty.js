/* Loyalty API — Pour Pass stars.
 *
 *   GET  /api/loyalty?phone=...   → one customer's pass (public; how a phone
 *                                   reads its own stars across devices)
 *   GET  /api/loyalty             → all customers (header x-admin-pin)
 *   POST /api/loyalty             → owner action (header x-admin-pin):
 *                                     { phone, name, delta }  adjust stars
 *                                     { phone, name, sale }   log an in-store
 *                                                             sale (+1 stamp)
 *
 * Customer: { phone, name, stars, rewards, lifetime, spent, lastVisit }
 */
import {
  kvConfigured, readList, checkPin, sendJson,
  CUSTOMERS_KEY, getCustomer, adjustStamps, awardStamp, normPhone,
} from './_store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const phoneQuery = (req.query && req.query.phone) || new URL(req.url, 'http://x').searchParams.get('phone');

  if (!kvConfigured()) {
    return sendJson(res, 200, { configured: false, customer: null, customers: [] });
  }

  try {
    if (req.method === 'GET') {
      // Public single-customer lookup by phone (no PIN — reads only its own pass).
      if (phoneQuery) {
        const customer = await getCustomer(phoneQuery);
        return sendJson(res, 200, { configured: true, customer });
      }
      // Full roster is owner-only.
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      const customers = await readList(CUSTOMERS_KEY);
      return sendJson(res, 200, { configured: true, customers });
    }

    if (req.method === 'POST') {
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const phone = normPhone(body.phone);
      if (!phone) return sendJson(res, 400, { error: 'phone required' });
      let customer;
      if (body.sale !== undefined) {
        customer = await awardStamp(phone, body.name, Number(body.sale) || 0);
      } else {
        customer = await adjustStamps(phone, Number(body.delta) || 0, body.name);
      }
      const customers = await readList(CUSTOMERS_KEY);
      return sendJson(res, 200, { configured: true, customer, customers });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return sendJson(res, 500, { error: 'store error' });
  }
}
