/* Bookings API — public submit, PIN-protected read.
 *
 *   POST   /api/bookings          → submit a "book the space" request (public)
 *   GET    /api/bookings          → list requests (header x-admin-pin)
 *   DELETE /api/bookings?id=...    → remove a request (header x-admin-pin)
 *
 * Each booking: { id, ref, name, contact, date, time, type, size, notes, status, createdAt }
 */
import { kvConfigured, readList, writeList, checkPin, sendJson } from './_store.js';

const KEY = 'pd:bookings';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!kvConfigured()) {
    if (req.method === 'POST') return sendJson(res, 501, { configured: false, error: 'Cloud store not configured' });
    return sendJson(res, 200, { configured: false, bookings: [] });
  }

  try {
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { name, contact, date } = body;
      if (!name || !contact || !date) return sendJson(res, 400, { error: 'name, contact, date required' });
      const bookings = await readList(KEY);
      const booking = {
        id: 'bkg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ref: body.ref || 'PD-EVT-' + String(Math.floor(1000 + Math.random() * 9000)),
        name, contact, date,
        time: body.time || '', type: body.type || '', size: body.size || '',
        notes: body.notes || '', status: 'new',
        createdAt: new Date().toISOString(),
      };
      bookings.unshift(booking);
      await writeList(KEY, bookings);
      return sendJson(res, 200, { configured: true, booking });
    }

    if (req.method === 'GET') {
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      const bookings = await readList(KEY);
      return sendJson(res, 200, { configured: true, bookings });
    }

    if (req.method === 'DELETE') {
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      const id = (req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: 'id required' });
      const bookings = (await readList(KEY)).filter((b) => b.id !== id);
      await writeList(KEY, bookings);
      return sendJson(res, 200, { configured: true, bookings });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return sendJson(res, 500, { error: 'store error' });
  }
}
