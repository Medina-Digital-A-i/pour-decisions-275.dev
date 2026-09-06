/* Square payments — charge a card token from the Web Payments SDK.
 *
 * The browser collects the card with Square's Web Payments SDK (PCI-safe —
 * the raw card never touches our server) and sends us a one-time `sourceId`
 * token. We charge it server-side with the secret access token.
 *
 * Env:
 *   SQUARE_ACCESS_TOKEN     (secret)  — server-side API token
 *   SQUARE_LOCATION_ID                — the location money is taken for
 *   SQUARE_APPLICATION_ID   (public)  — needed by the browser SDK
 *   SQUARE_ENVIRONMENT                — 'production' to take real money;
 *                                       anything else (default) = 'sandbox'
 *
 * Degrades safely: with no keys, squareConfigured() is false and checkout
 * stays "pay at pickup" — nothing is charged.
 */
import { randomUUID } from 'crypto';

const ENV = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
const IS_PROD = ENV === 'production' || ENV === 'prod';
const SQUARE_VERSION = '2025-01-23';

export function squareEnv() { return IS_PROD ? 'production' : 'sandbox'; }
export function squareApiBase() {
  return IS_PROD ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
}

/** True once the server can charge (secret token + location are set). */
export function squareConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

/**
 * True when card payments are fully wired end-to-end — i.e. the browser can
 * render the card form (needs the Application ID) AND the server can charge.
 * This is the gate for *requiring* a card, so a partial setup never demands a
 * card the customer was never shown.
 */
export function squareEnabled() {
  return squareConfigured() && Boolean(process.env.SQUARE_APPLICATION_ID);
}

/** Non-secret config the browser SDK needs. `enabled` gates the card form. */
export function squarePublicConfig() {
  return {
    enabled: squareEnabled(),
    applicationId: process.env.SQUARE_APPLICATION_ID || null,
    locationId: process.env.SQUARE_LOCATION_ID || null,
    environment: squareEnv(),
  };
}

/**
 * Charge a card token. Returns { ok:true, payment } on success, or
 * { ok:false, error } with a customer-safe message on failure.
 */
export async function squareCharge({ sourceId, amountCents, referenceId, note }) {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const payload = {
    source_id: sourceId,
    idempotency_key: randomUUID(),
    amount_money: { amount: Math.round(amountCents), currency: 'USD' },
    location_id: locationId,
    autocomplete: true,
  };
  if (referenceId) payload.reference_id = String(referenceId).slice(0, 40);
  if (note) payload.note = String(note).slice(0, 60);

  let res, data;
  try {
    res = await fetch(`${squareApiBase()}/v2/payments`, {
      method: 'POST',
      headers: {
        'Square-Version': SQUARE_VERSION,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    console.error('Square network error', e && e.message);
    return { ok: false, error: 'Could not reach the card processor. Please try again.' };
  }

  if (!res.ok || !data.payment) {
    // Surface Square's own reason in the logs; keep the customer message clean.
    const first = data.errors && data.errors[0];
    console.error('Square payment failed', res.status, JSON.stringify(data.errors || data));
    const msg =
      first && first.code === 'CARD_DECLINED' ? 'Your card was declined — try another card.'
      : first && first.code === 'CVV_FAILURE' ? "That card's security code looks wrong."
      : first && first.code === 'ADDRESS_VERIFICATION_FAILURE' ? 'The billing ZIP did not match.'
      : first && first.detail ? first.detail
      : 'Payment could not be completed. Please try again.';
    return { ok: false, error: msg };
  }

  const p = data.payment;
  const card = (p.card_details && p.card_details.card) || {};
  return {
    ok: true,
    payment: {
      id: p.id,
      status: p.status,
      last4: card.last_4 || null,
      brand: card.card_brand || null,
      amount: (p.amount_money && p.amount_money.amount) || Math.round(amountCents),
    },
  };
}
