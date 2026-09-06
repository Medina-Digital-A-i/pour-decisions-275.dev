/* Auth API — passwordless phone + 6-digit SMS code.
 *
 *   POST /api/auth { action:'request', phone }
 *        → generates a code, stores it (10 min TTL), texts it via Twilio.
 *          Returns { ok, isNew, sent }.
 *   POST /api/auth { action:'verify', phone, code, name }
 *        → checks the code, ensures the customer exists, issues a session
 *          token (120-day TTL). Returns { token, user }.
 *   GET  /api/auth (header x-session)
 *        → returns the signed-in { user } (for refresh), or 401.
 *
 * Identity is the mobile number (digits only) — the same key the loyalty
 * store uses, so a signed-in member and their Pour Pass are one record.
 *
 * Degrades safely:
 *   - No KV attached  → 501 (front-end uses on-device fallback in local dev).
 *   - No Twilio set   → 501 on request, unless AUTH_DEV_CODE is set (then the
 *                       code is fixed to that value and not texted, for testing).
 */
import { randomBytes, randomInt } from 'crypto';
import {
  kvConfigured, kvSet, kvGet, kvDel,
  normPhone, getCustomer, adjustStamps, getSessionPhone, sendJson,
} from './_store.js';

const CODE_TTL = 60 * 10;          // 10 minutes
const SESSION_TTL = 60 * 60 * 24 * 120; // 120 days

function shapeUser(c) {
  return {
    phone: c.phone,
    name: c.name || 'Member',
    stamps: c.stars || 0,
    rewards: c.rewards || 0,
    orders: c.lifetime || 0,
    spent: c.spent || 0,
    since: c.createdAt ? new Date(c.createdAt).getFullYear() : new Date().getFullYear(),
    notifications: [],
  };
}

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID)
  );
}

// Twilio Verify — the preferred OTP path. Twilio generates, stores, sends, and
// checks the code, routing it through its own compliant sending pool (much
// better deliverability than a self-managed 10DLC number).
function verifyConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
}
function twilioAuthHeader() {
  return 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
}
// Start a verification — Twilio sends the code. Returns {ok} or {ok:false,error}.
async function verifyStart(phone) {
  const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
  const params = new URLSearchParams();
  params.set('To', '+1' + normPhone(phone));
  params.set('Channel', 'sms');
  try {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${svc}/Verifications`, {
      method: 'POST',
      headers: { Authorization: twilioAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('Verify start failed', res.status, JSON.stringify(data));
      return { ok: false, error: (data && data.message) || `Twilio Verify error ${res.status}` };
    }
    return { ok: true, status: data.status };
  } catch (e) {
    console.error('Verify start error', e && e.message);
    return { ok: false, error: 'Could not reach Twilio Verify. Please try again.' };
  }
}
// Check a code. Returns {ok:true,approved} or {ok:false} on a system error.
async function verifyCheck(phone, code) {
  const svc = process.env.TWILIO_VERIFY_SERVICE_SID;
  const params = new URLSearchParams();
  params.set('To', '+1' + normPhone(phone));
  params.set('Code', code);
  try {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${svc}/VerificationCheck`, {
      method: 'POST',
      headers: { Authorization: twilioAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json().catch(() => ({}));
    // 404 = verification expired / already used / max attempts → treat as "not approved".
    if (!res.ok && res.status !== 404) {
      console.error('Verify check failed', res.status, JSON.stringify(data));
      return { ok: false };
    }
    return { ok: true, approved: Boolean(data && data.status === 'approved') };
  } catch (e) {
    console.error('Verify check error', e && e.message);
    return { ok: false };
  }
}

async function sendSms(phone, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const msvc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const params = new URLSearchParams();
  params.set('To', '+1' + normPhone(phone));
  if (msvc) params.set('MessagingServiceSid', msvc); else params.set('From', from);
  params.set('Body', body);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      // Surface Twilio's own message (e.g. unverified number, 10DLC not
      // registered, geo-permissions) so the failure isn't silent.
      const detail = await res.text().catch(() => '');
      console.error('Twilio send failed', res.status, detail);
      return { ok: false, status: res.status, detail };
    }
    // Twilio accepted the request — capture the message SID + initial status so
    // a diagnostic can poll the *final* delivery state (carrier filtering /
    // A2P 10DLC blocks show up here, not at create time).
    const data = await res.json().catch(() => ({}));
    return { ok: true, sid: data.sid || null, twStatus: data.status || null, errorCode: data.error_code || null };
  } catch (e) {
    console.error('Twilio request error', e && e.message);
    return { ok: false, status: 0, detail: (e && e.message) || 'network error' };
  }
}

// Fetch a message's current delivery status + error code (after carriers act).
async function fetchTwilioStatus(sid) {
  const acc = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${acc}/Messages/${sid}.json`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${acc}:${tok}`).toString('base64') },
    });
    if (!res.ok) return null;
    const d = await res.json().catch(() => ({}));
    return { status: d.status || null, errorCode: d.error_code || null, errorMessage: d.error_message || null };
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-session');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ── Diagnostics (run BEFORE any config gate; never leak secrets) ──
  // GET /api/auth?diag=1                      → what's wired up
  // GET /api/auth?testsms=1&to=NNN&pin=PIN    → attempt a real text, show Twilio's exact error
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://x');
    if (url.searchParams.get('diag') === '1') {
      const from = process.env.TWILIO_FROM || '';
      return sendJson(res, 200, {
        diag: true,
        storeConnected: kvConfigured(),
        verifyConfigured: verifyConfigured(),
        twilioConfigured: twilioConfigured(),
        activePath: verifyConfigured() ? 'twilio-verify' : (twilioConfigured() ? 'legacy-sms' : (process.env.AUTH_DEV_CODE ? 'dev-code' : 'none')),
        have: {
          TWILIO_ACCOUNT_SID: Boolean(process.env.TWILIO_ACCOUNT_SID),
          TWILIO_AUTH_TOKEN: Boolean(process.env.TWILIO_AUTH_TOKEN),
          TWILIO_VERIFY_SERVICE_SID: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID),
          TWILIO_FROM: Boolean(process.env.TWILIO_FROM),
          TWILIO_MESSAGING_SERVICE_SID: Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID),
          AUTH_DEV_CODE: Boolean(process.env.AUTH_DEV_CODE),
          store_REDIS_URL: Boolean(process.env.REDIS_URL || process.env.REDIS_TLS_URL || process.env.KV_URL),
        },
        fromLast4: from ? from.slice(-4) : null,
        hint: !kvConfigured() ? 'Cloud store (REDIS_URL) is not connected — sign-in cannot work until it is.'
          : verifyConfigured() ? 'Twilio Verify is active — codes are sent and checked by Twilio Verify (best deliverability).'
          : 'Recommended: create a Twilio Verify Service and set TWILIO_VERIFY_SERVICE_SID (starts with VA…). Without it, sign-in uses the legacy self-managed SMS path, which carriers may block if the number is not registered for A2P 10DLC.',
      });
    }
    if (url.searchParams.get('testsms') === '1') {
      const pin = url.searchParams.get('pin') || '';
      if (String(pin) !== String(process.env.ADMIN_PIN || '7687')) return sendJson(res, 401, { error: 'Bad or missing PIN (?pin=...)' });
      const to = normPhone(url.searchParams.get('to') || '');
      if (to.length !== 10) return sendJson(res, 400, { error: 'Add a 10-digit number: ?to=5185551234' });
      if (!twilioConfigured()) return sendJson(res, 200, { sent: false, reason: 'Twilio env vars are not set', twilioConfigured: false });
      const r = await sendSms(to, 'Pour Decisions test — your text setup is working! 🍊');
      if (!r.ok) return sendJson(res, 502, { acceptedByTwilio: false, twilioError: r.detail || null });
      // Twilio accepted it. Poll the final delivery status — this is where an
      // unregistered A2P 10DLC number shows up as undelivered (error 30034).
      let final = null;
      if (r.sid) {
        await new Promise((rs) => setTimeout(rs, 5000));
        final = await fetchTwilioStatus(r.sid);
      }
      const delivered = final && ['delivered', 'sent'].includes(final.status);
      return sendJson(res, 200, {
        acceptedByTwilio: true,
        messageSid: r.sid,
        deliveryStatus: final ? final.status : (r.twStatus || 'unknown'),
        errorCode: final ? final.errorCode : null,
        errorMessage: final ? final.errorMessage : null,
        verdict: delivered ? 'Delivered — texting works.'
          : (final && final.errorCode === 30034) ? 'BLOCKED: this number is not registered for A2P 10DLC. Register it in Twilio (or use a verified Toll-Free number).'
          : (final && final.status === 'undelivered') ? `Carrier did not deliver it (error ${final.errorCode}). Check the number's A2P 10DLC / Toll-Free verification in Twilio.`
          : 'Twilio accepted it but final delivery is still pending — check the Twilio Messaging logs for this SID.',
      });
    }
  }

  if (!kvConfigured()) {
    return sendJson(res, 501, { configured: false, error: 'Accounts not connected yet (attach the cloud store).' });
  }

  try {
    // GET → refresh the signed-in user from their session token.
    if (req.method === 'GET') {
      const phone = await getSessionPhone(req);
      if (!phone) return sendJson(res, 401, { error: 'Not signed in' });
      const c = await getCustomer(phone);
      if (!c) return sendJson(res, 401, { error: 'Not signed in' });
      return sendJson(res, 200, { user: shapeUser(c) });
    }

    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action;
    const phone = normPhone(body.phone);
    if (phone.length !== 10) return sendJson(res, 400, { error: 'Enter a 10-digit US mobile number' });

    if (action === 'request') {
      const devCode = process.env.AUTH_DEV_CODE;

      // Preferred path: Twilio Verify handles code generation, delivery & expiry.
      if (verifyConfigured() && !devCode) {
        const r = await verifyStart(phone);
        if (!r.ok) {
          return sendJson(res, 502, { error: r.error || "We couldn't text your code right now. Please try again." });
        }
        const existing = await getCustomer(phone);
        return sendJson(res, 200, { ok: true, isNew: !existing, sent: true, channel: 'verify' });
      }

      // Fallback path: AUTH_DEV_CODE (testing) or legacy self-managed SMS code.
      const canText = twilioConfigured();
      if (!canText && !devCode) {
        return sendJson(res, 501, { error: 'Texting not connected yet — add Twilio to go live.' });
      }
      const code = devCode || String(randomInt(0, 1000000)).padStart(6, '0');
      await kvSet(`pd:authcode:${phone}`, code, CODE_TTL);
      const existing = await getCustomer(phone);
      let sent = false;
      if (canText) {
        const r = await sendSms(phone, `Your Pour Decisions code is ${code}. Expires in 10 minutes.`);
        sent = r.ok;
        if (!sent) {
          // Don't leave a code the member can never receive, and don't pretend
          // it was sent — tell the client the text actually failed.
          await kvDel(`pd:authcode:${phone}`);
          return sendJson(res, 502, {
            error: "We couldn't text your code right now. Double-check the number, then try again.",
          });
        }
      }
      return sendJson(res, 200, { ok: true, isNew: !existing, sent });
    }

    if (action === 'verify') {
      const code = String(body.code || '').trim();
      if (!/^\d{6}$/.test(code)) return sendJson(res, 400, { error: 'Enter the 6-digit code' });
      const devCode = process.env.AUTH_DEV_CODE;

      // Preferred path: ask Twilio Verify whether the code is correct.
      if (verifyConfigured() && !devCode) {
        const r = await verifyCheck(phone, code);
        if (!r.ok) return sendJson(res, 502, { error: 'Could not check the code right now — please try again.' });
        if (!r.approved) return sendJson(res, 401, { error: 'That code is wrong or expired' });
      } else {
        // Fallback: our own stored code (dev / legacy).
        const stored = await kvGet(`pd:authcode:${phone}`);
        if (!stored || String(stored) !== code) return sendJson(res, 401, { error: 'That code is wrong or expired' });
        await kvDel(`pd:authcode:${phone}`);
      }

      // Ensure the customer exists and set their name (delta 0 = no stamp change).
      const c = await adjustStamps(phone, 0, (body.name || '').trim() || undefined);
      const token = randomBytes(24).toString('hex');
      await kvSet(`pd:session:${token}`, phone, SESSION_TTL);
      return sendJson(res, 200, { token, user: shapeUser(c) });
    }

    return sendJson(res, 400, { error: 'Unknown action' });
  } catch (e) {
    console.error('auth handler error', e);
    return sendJson(res, 500, { error: 'Something went wrong' });
  }
}
