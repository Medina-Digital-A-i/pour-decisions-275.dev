/* Events API — public read, PIN-protected write.
 *
 *   GET    /api/events           → { configured, events: [...] }
 *   POST   /api/events           → add an event   (header x-admin-pin)
 *   DELETE /api/events?id=...     → remove an event (header x-admin-pin)
 *
 * Each event: { id, iso, type, title, time, desc, createdAt }
 */
import { kvConfigured, readList, writeList, checkPin, sendJson } from './_store.js';

const KEY = 'pd:events';

export default async function handler(req, res) {
  // Same-origin app, but allow simple cross-origin reads for flexibility.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!kvConfigured()) {
    // Backend not attached yet — tell the client to use on-device storage.
    if (req.method === 'GET') return sendJson(res, 200, { configured: false, events: [] });
    return sendJson(res, 501, { configured: false, error: 'Cloud store not configured' });
  }

  try {
    if (req.method === 'GET') {
      const events = await readList(KEY);
      return sendJson(res, 200, { configured: true, events });
    }

    if (req.method === 'POST') {
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { iso, type, title, time, desc } = body;
      if (!iso || !title || !time) return sendJson(res, 400, { error: 'iso, title, time required' });
      const events = await readList(KEY);
      const event = {
        id: 'evt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        iso, type: type || 'special', title, time,
        desc: desc || 'Posted by the Pour Decisions crew.',
        createdAt: new Date().toISOString(),
      };
      events.push(event);
      await writeList(KEY, events);
      return sendJson(res, 200, { configured: true, event, events });
    }

    if (req.method === 'DELETE') {
      if (!checkPin(req)) return sendJson(res, 401, { error: 'Bad PIN' });
      const id = (req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: 'id required' });
      const events = (await readList(KEY)).filter((e) => e.id !== id);
      await writeList(KEY, events);
      return sendJson(res, 200, { configured: true, events });
    }

    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return sendJson(res, 500, { error: 'store error' });
  }
}
