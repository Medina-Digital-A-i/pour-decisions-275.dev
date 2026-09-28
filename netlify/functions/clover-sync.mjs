// Every 10 minutes: pull paid Clover orders and award points + Pour Pass stamps to the members on them.
// Does nothing until CLOVER_API_TOKEN + CLOVER_MERCHANT_ID are set. Owners can also run it from the dashboard.
import { syncOrders } from './lib/clover.mjs';
export default async (req) => {
  try { console.log('[clover-sync]', JSON.stringify(await syncOrders(new Request(process.env.URL || 'https://pourdecisionsjuicebar.com')))); }
  catch (e) { console.error('[clover-sync]', e.message); }
};
export const config = { schedule: '*/10 * * * *' };
