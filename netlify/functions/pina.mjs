// Piña — the shop's chat assistant (Claude via the Anthropic API).
// POST /api/pina  {messages:[{role:'user'|'assistant', text}], cart?:[{name,qty,size}], member?:{name}}
//   -> {text, chips:[], actions:[{type:'add_to_cart', id, size, qty} | {type:'navigate', screen} | {type:'open', url}]}
// Stateless: the browser keeps the conversation in memory only, so every visit starts fresh.
// With no ANTHROPIC_API_KEY set it answers 503 {fallback:true} and the site uses its built-in scripted Piña.
import Anthropic from '@anthropic-ai/sdk';
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { loadMenu } from './members.mjs';
import { shopKnowledge, catalogue } from './lib/shop.mjs';
import { createRequest, dayAvailability, BLOCKS } from './lib/requests.mjs';

const MODEL = process.env.PINA_MODEL || 'claude-opus-5';
const MAX_TURNS = 24, MAX_CHARS = 1500, PER_HOUR = +process.env.PINA_PER_HOUR || 40, PER_DAY = +process.env.PINA_DAILY_LIMIT || 2000;
const SCREENS = ['menu', 'packages', 'venue', 'events', 'pass', 'wheel', 'prizes', 'cart', 'account', 'auth', 'gallery'];
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const nyNow = () => new Date().toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const nyDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const PERSONA = `You are Piña, the chat assistant for Pour Decisions, a cold-pressed juice & smoothie bar with real food in Albany, NY. You live inside the shop's website/app.

What you do:
- Help people pick drinks and food from the menu below, and explain ingredients and what they're good for.
- Take orders: when someone wants something, call add_to_cart (one call per item). Confirm size when it matters (16 vs 24 oz; salad protein). Protein/add-ons on salads that aren't a menu variant can't go in the cart — tell them to mention it at pickup. After adding, tell them they can check out from the cart (free account, pay at pickup), and offer something that goes with it.
- Find deals: juice packs, cleanses, office/crew packs, Pour Pass memberships, points, the monthly prize spin. Point people to the cheapest way to get what they want.
- Sell the event space: whenever it fits (parties, meetings, "what else do you do"), mention they can book the whole bar. Use check_date to look at the calendar, then request_event_space to send the request. Pricing is by quote — never make up a price.
- Request a call: if someone wants to talk to a person, has a big/custom order, or you can't answer, offer request_callback.
- Mention online options when useful: ordering here, Clover online ordering, Uber Eats, DoorDash.

Rules:
- Stay on Pour Decisions: the menu, the shop, ordering, deals, events and the space. For anything unrelated, say briefly you're just the juice-bar assistant and steer back.
- Only use facts from the SHOP KNOWLEDGE. Prices are exact — never guess, round or invent items, discounts, hours or policies. If you don't know, say so and offer a call back.
- Before calling request_event_space or request_callback, read back the details (name, phone and/or email, date and time block, guests) and get a clear yes. Never submit twice for the same thing.
- Health: general wellness info only; no medical claims or advice. For allergies, list the ingredients and suggest they tell staff.
- Tone: warm, quick, a little playful; bar-pun drink names are part of the brand. No emojis. Keep replies short — 1 to 4 short sentences or a tight list — this is a phone chat.
- Plain text only — no markdown, no asterisks or headings. For short lists use lines starting with "• ".
- Latency-sensitive; begin your visible answer immediately.
- End every reply with one line of 2–3 short tap-to-send follow-ups in exactly this format:
>> First option | Second option | Third option`;

const TOOLS = [
  { name: 'add_to_cart', description: "Add a menu item to the customer's cart. Use the item's [id:...] from the menu. size is the oz (\"16\", \"24\", \"2\") for drinks, or the variant key for food with variants (e.g. \"salad\", \"chicken\", \"salmon\"); omit it for single-price items.", strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['item_id', 'qty'], properties: { item_id: { type: 'string' }, size: { type: 'string' }, qty: { type: 'integer' } } } },
  { name: 'show_screen', description: 'Open a screen of the site for the customer: menu, packages (juice packs, cleanses, office), venue (event space + booking form), events, pass (Pour Pass/points), wheel (monthly prize spin), prizes, cart, account, auth (sign in / create account), gallery.', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['screen'], properties: { screen: { type: 'string', enum: SCREENS } } } },
  { name: 'list_events', description: 'Upcoming public events at the shop (pop-ups, tastings, workshops).', strict: true,
    input_schema: { type: 'object', additionalProperties: false, properties: {} } },
  { name: 'check_date', description: 'Check the event-space calendar for one date: which time blocks are open, already requested, or booked, plus shop events that day.', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['date'], properties: { date: { type: 'string', description: 'YYYY-MM-DD' } } } },
  { name: 'request_event_space', description: 'Send an event-space booking request to the owners. Only after the customer confirmed the details. The owners reply with a quote.', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['name', 'date', 'block'], properties: {
      name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' },
      block: { type: 'string', enum: Object.keys(BLOCKS) }, guests: { type: 'string' }, event_type: { type: 'string' },
      package: { type: 'string', enum: ['The Sip', 'The Squeeze', 'The Full Pour', 'The Boardroom', 'Not sure'] }, notes: { type: 'string' } } } },
  { name: 'request_callback', description: 'Ask the owners to call the customer back. Only after the customer confirmed their name and number.', strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['name', 'phone', 'topic'], properties: {
      name: { type: 'string' }, phone: { type: 'string' }, topic: { type: 'string' }, best_time: { type: 'string' }, notes: { type: 'string' } } } },
];

async function overLimit(req) {
  const st = getStore({ name: 'pina', consistency: 'strong' });
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'anon';
  const who = createHash('sha256').update(ip + (process.env.URL || '')).digest('hex').slice(0, 16);
  const hour = new Date().toISOString().slice(0, 13), day = nyDate();
  const [h, d] = await Promise.all([st.get(`rl:${who}:${hour}`, { type: 'json' }), st.get(`day:${day}`, { type: 'json' })]);
  if ((h || 0) >= PER_HOUR || (d || 0) >= PER_DAY) return true;
  await Promise.all([st.setJSON(`rl:${who}:${hour}`, (h || 0) + 1), st.setJSON(`day:${day}`, (d || 0) + 1)]);
  return false;
}

async function runTool(name, input, ctx) {
  if (name === 'add_to_cart') {
    const it = ctx.cat.get(String(input.item_id));
    if (!it) return { error: `No menu item with id "${input.item_id}". Use an [id:...] from the menu.` };
    const options = it.sizes.length ? it.sizes : it.variants;
    let size = input.size ? String(input.size).replace(/\s*oz$/i, '').toLowerCase() : '';
    if (options.length && !options.includes(size)) {
      if (input.size) return { error: `${it.name} comes in: ${options.join(', ')}.` };
      size = options[0];
    }
    const qty = Math.max(1, Math.min(20, +input.qty || 1));
    ctx.actions.push({ type: 'add_to_cart', id: it.id, size, qty });
    return { ok: true, added: `${qty} × ${it.name}${size ? ' (' + (it.sizes.length ? size + ' oz' : size) + ')' : ''}` };
  }
  if (name === 'show_screen') {
    if (!SCREENS.includes(input.screen)) return { error: 'Unknown screen.' };
    ctx.actions.push({ type: 'navigate', screen: input.screen });
    return { ok: true };
  }
  if (name === 'list_events') {
    const events = ((await getStore({ name: 'content', consistency: 'strong' }).get('events', { type: 'json' })) || [])
      .filter((e) => !e.hidden && e.date >= nyDate()).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 8)
      .map((e) => ({ title: e.title, date: e.date, time: e.time || '', price: +e.price || 0, desc: e.desc || '' }));
    return { events, note: events.length ? '' : 'No public events on the calendar right now.' };
  }
  if (name === 'check_date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')) return { error: 'Date must be YYYY-MM-DD.' };
    if (input.date < nyDate()) return { error: 'That date has passed.' };
    return await dayAvailability(input.date);
  }
  if (name === 'request_event_space' || name === 'request_callback') {
    if (ctx.submitted >= 2) return { error: 'Already sent requests in this chat — the owners will be in touch.' };
    const r = name === 'request_callback'
      ? await createRequest({ kind: 'callback', name: input.name, phone: input.phone, topic: input.topic, bestTime: input.best_time, notes: input.notes }, { origin: ctx.origin, source: 'Piña chat' })
      : await createRequest({ kind: 'venue', name: input.name, email: input.email, phone: input.phone, date: input.date, block: input.block, guests: input.guests, eventType: input.event_type, package: input.package, notes: input.notes }, { origin: ctx.origin, source: 'Piña chat' });
    if (r.error) return { error: r.error };
    ctx.submitted++;
    return { ok: true, reference: String(r.request.id).slice(-6), next: name === 'request_callback' ? 'An owner will call during shop hours.' : 'The owners reply with availability and a quote, usually within a day.' };
  }
  return { error: 'Unknown tool.' };
}

// After a server-side fallback, only text blocks from before the last fallback marker may be echoed back.
function echoable(content) {
  const last = content.map((b) => b.type).lastIndexOf('fallback');
  return content.filter((b, i) => b.type !== 'fallback' && (i > last || b.type === 'text'));
}

function splitChips(text) {
  const lines = String(text || '').trim().split('\n');
  let chips = [];
  if (lines.length && /^>>/.test(lines[lines.length - 1].trim())) {
    chips = lines.pop().replace(/^\s*>>\s*/, '').split('|').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  }
  return { text: lines.join('\n').trim(), chips };
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  if (!process.env.ANTHROPIC_API_KEY) return json({ fallback: true, reason: 'not configured' }, 503);
  let body = {}; try { body = await req.json(); } catch {}
  const turns = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.text.slice(0, MAX_CHARS) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return json({ error: 'Say something first.' }, 400);
  // the API wants alternating roles — merge any back-to-back turns from the same side
  const messages = [];
  for (const t of turns) { const prev = messages[messages.length - 1]; if (prev && prev.role === t.role) prev.content += '\n' + t.content; else messages.push({ ...t }); }
  if (await overLimit(req)) return json({ text: "I'm getting a lot of questions right now — give me a minute, or call/text the shop at (838) 261-9233.", chips: [], actions: [] });

  const origin = new URL(req.url).origin;
  const menu = await loadMenu(req);
  const cart = (Array.isArray(body.cart) ? body.cart : []).slice(0, 20).map((c) => `${+c.qty || 1} × ${String(c.name || '').slice(0, 60)}${c.size ? ' (' + String(c.size).slice(0, 12) + ')' : ''}`);
  const member = body.member && body.member.name ? String(body.member.name).slice(0, 40) : '';
  // Volatile context rides on the newest user turn so the cached prefix (tools + system) stays byte-stable.
  const last = messages[messages.length - 1];
  last.content = [{ type: 'text', text: `[Now: ${nyNow()} (Albany). Customer: ${member ? 'signed in as ' + member : 'not signed in'}. Cart: ${cart.length ? cart.join(', ') : 'empty'}.]` }, { type: 'text', text: last.content }];

  const ctx = { cat: catalogue(menu), actions: [], origin, submitted: 0 };
  const client = new Anthropic();
  const system = [{ type: 'text', text: PERSONA + '\n\nSHOP KNOWLEDGE\n' + shopKnowledge(menu), cache_control: { type: 'ephemeral' } }];
  let reply = '';
  try {
    for (let i = 0; i < 6; i++) {
      const res = await client.beta.messages.create({
        model: MODEL, max_tokens: 16000, system, tools: TOOLS, messages,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      });
      if (res.stop_reason === 'refusal') { reply = "That's outside what I can help with here. Ask me about the menu, deals, ordering or booking the space.\n>> What's good today? | Show me deals | Book the space"; break; }
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      const uses = res.content.filter((b) => b.type === 'tool_use');
      if (res.stop_reason !== 'tool_use' || !uses.length) { reply = text; break; }
      messages.push({ role: 'assistant', content: echoable(res.content) });
      const results = [];
      for (const u of uses) {
        let out; try { out = await runTool(u.name, u.input || {}, ctx); } catch (e) { out = { error: 'That did not go through — try again in a moment.' }; console.error('[pina] tool', u.name, e); }
        results.push({ type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(out), ...(out && out.error ? { is_error: true } : {}) });
      }
      messages.push({ role: 'user', content: results });
    }
  } catch (e) {
    console.error('[pina]', e && e.status, e && e.message);
    return json({ fallback: true, reason: 'api error' }, 503);
  }
  const { text, chips } = splitChips(reply || "Sorry — lost my train of thought. Ask me again?");
  return json({ text, chips, actions: ctx.actions });
};
export const config = { path: '/api/pina' };
