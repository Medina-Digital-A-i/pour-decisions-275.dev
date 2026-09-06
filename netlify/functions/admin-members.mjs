// Owner-only export of the member / email list.
//   GET /api/admin/members.csv      (header: Authorization: Bearer <ADMIN_TOKEN>)
// ADMIN_TOKEN is set in Netlify → Site configuration → Environment variables. If unset, this endpoint is disabled.
import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'node:crypto';

export default async (req) => {
  const want = process.env.ADMIN_TOKEN || '';
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const ok = want.length >= 24 && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
  if (!ok) return new Response('Forbidden', { status: 403 });
  const store = getStore('members');
  const rows = [];
  let cursor;
  do {
    const page = await store.list({ prefix: 'list:', cursor });
    for (const b of page.blobs) { const m = await store.get(b.key, { type: 'json' }); if (m) rows.push(m); }
    cursor = page.cursor;
  } while (cursor);
  rows.sort((a, b) => (a.created < b.created ? 1 : -1));
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = ['email,name,phone,marketing_opt_in,joined,points,orders']
    .concat(rows.map((r) => [r.email, r.name, r.phone, r.marketing ? 'yes' : 'no', r.created, r.points, r.orders].map(esc).join(',')))
    .join('\n');
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="pour-decisions-members.csv"', 'cache-control': 'no-store' } });
};
export const config = { path: '/api/admin/members.csv' };
