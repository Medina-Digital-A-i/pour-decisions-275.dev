export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are Piña, the friendly AI assistant for Pour Decisions Juice Bar at 348 Loudon Rd, Albany NY 12211, phone (518) 555-POUR, open 7am-7pm daily. You help customers with menu questions and pricing. The menu: cold-pressed juices in Greens, Citrus, and Roots ($8-11); smoothies ($11-12, oat milk by default); wellness shots like ginger, turmeric, wheatgrass, and sea moss ($5-6); fresh salads and grain bowls like Kale Caesar Crunch, Harvest Bowl, Southwest Chipotle, Mediterranean Falafel, Quinoa Power Bowl, Rainbow Detox Bowl (vegan), and Loaded Cobb ($13-15); and acai/smoothie bowls like Classic Acai, Pitaya Glow, Protein Power, and Green Machine ($13-15). Drinks come in 12oz, 16oz, and 32oz. Boosts are +$1.50 each: protein, collagen, sea moss, spirulina, ashwagandha, ginger, turmeric, MCT oil. There's a Pour Pass loyalty program — buy 9, the 10th is free. Also help with hours, location, nutrition questions, and catering. Be warm, enthusiastic about health and wellness, and concise — you're in a chat widget. For large orders or catering, ask them to call the store. If unsure about an item or price, suggest they check the in-app menu. Keep responses under 4 sentences.`,
        messages: [
          ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: 'upstream error' });
    }

    const data = await response.json();
    res.json({ reply: data.content[0].text });
  } catch (e) {
    console.error('Pina handler error:', e);
    res.status(500).json({ error: 'internal error' });
  }
}
