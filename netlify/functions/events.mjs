// Public events feed — GET /api/events. Owners manage events in the dashboard (/api/admin/events).
import { getStore } from '@netlify/blobs';
export default async () => {
  const st = getStore({ name: 'content', consistency: 'strong' });
  const events = (await st.get('events', { type: 'json' })) || [];
  const today = new Date().toISOString().slice(0, 10);
  const pub = events.filter(e => !e.hidden && e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(({ id, title, date, time, desc, price, link, emoji, rsvps }) => ({ id, title, date, time: time || '', desc: desc || '', price: +price || 0, link: link || '', emoji: emoji || '', rsvps: rsvps || 0 }));
  return new Response(JSON.stringify({ events: pub }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
};
export const config = { path: '/api/events' };
