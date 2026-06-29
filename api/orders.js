/* Orders API — customers place orders, owner reads & updates them.
 *
 *   POST   /api/orders            → place an order (public). Awards 1 Pour Pass
 *                                   stamp to the customer's phone automatically.
 *   GET    /api/orders            → list orders (header x-admin-pin)
 *   PATCH  /api/orders?id=...     → update status (header x-admin-pin)
 *   DELETE /api/orders?id=...     → remove an order (header x-admin-pin)
 *
 * Each order: { id, num, name, phone, items, subtotal, tax, tip, total,
 *               pickup, status, createdAt }
 * Statuses: new → ready → done
 */
import {
  kvConfigured, readList, writeList, checkPin, sendJson, awardStamp, normPhone,
} from './_store.js';

const KEY = 'pd:orders';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!kvConfigured()) {
    if (req.method === 'POST') return sendJson(res, 501, { configured: false, error: 'Cloud store not configured' });
    return sendJson(res, 200, { configured: false, orders: [] });
  }

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { name, phone, items, total } = body;
      if (!phone || !Array.isArray(items) || !items.length) {
        return sendJson(res, 400, { error: 'phone and items required' });
      }
      const orders = await readList(KEY);
      const order = {
        id: 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        num: body.num || 'PD-' + String(Math.floor(1000 + Math.random() * 9000)),
        name: name || '', phone: normPhone(phone),
        items, subtotal: Number(body.subtotal) || 0, tax: Number(body.tax) || 0,
        tip: Number(body.tip) || 0, total: Number(total) || 0,
        pickup: body.pickup || '348 Loudon Rd, Albany NY',
        when: body.when === 'schedule' ? 'schedule' : 'asap',
        notes: String(body.notes || '').slice(0, 280),
        status: 'new', createdAt: new Date().toISOString(),
      };
      orders.unshift(order);
      await writeList(KEY, orders);
      // Awarding the stamp is what ties a purchase to the customer's pass.
      const customer = await awardStamp(order.phone, order.name, order.total);
      return sendJson(res, 200, { configured: true, order, customer });
    }

    if (req.method === 'GET') {
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      const orders = await readList(KEY);
      return sendJson(res, 200, { configured: true, orders });
    }

    const id = (req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id');

    if (req.method === 'PATCH') {
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!id) return sendJson(res, 400, { error: 'id required' });
      const orders = await readList(KEY);
      const o = orders.find((x) => x.id === id);
      if (!o) return sendJson(res, 404, { error: 'not found' });
      if (body.status) o.status = body.status;
      await writeList(KEY, orders);
      return sendJson(res, 200, { configured: true, order: o, orders });
    }

    if (req.method === 'DELETE') {
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      if (!id) return sendJson(res, 400, { error: 'id required' });
      const orders = (await readList(KEY)).filter((o) => o.id !== id);
      await writeList(KEY, orders);
      return sendJson(res, 200, { configured: true, orders });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return sendJson(res, 500, { error: 'store error' });
  }
}
