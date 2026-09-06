/* Payment config — GET /api/pay
 *
 * Returns the non-secret Square config the browser SDK needs:
 *   { enabled, applicationId, locationId, environment }
 * The front-end shows the card form only when `enabled` is true; otherwise
 * checkout stays "pay at pickup". No secrets are exposed here.
 */
import { sendJson } from './_store.js';
import { squarePublicConfig } from './_square.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' });
  return sendJson(res, 200, squarePublicConfig());
}
