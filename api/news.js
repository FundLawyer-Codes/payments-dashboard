export const config = { maxDuration: 60 };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { query, label } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        tool_choice: { type: 'any' },
        messages: [{
          role: 'user',
          content: `You are a research assistant helping an in-house lawyer at a cross-border payments company focused on China inbound/outbound corridors.

Find the 4 most recent and relevant news articles for the section: "${label}"
Search for: ${query}

- Search multiple times if needed to find good results
- Prioritize Bloomberg, Reuters, regulatory agency websites, and payments industry publications
- Focus on: regulatory changes, enforcement actions, policy updates, industry developments
- Articles should be from the last 60 days where possible
- Return ONLY a raw JSON array, no markdown, no explanation:

[{"title":"Article title","url":"https://...","source":"Bloomberg / Reuters / etc","date":"YYYY-MM-DD"}]

If nothing relevant found after searching, return: []`
        }],
      }),
    });

    const data = await response.json();
    console.log(`[${label}] blocks:`, data.content?.map(b => b.type).join(','), 'error:', data.error?.message);

    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) return res.status(200).json([]);

    let text = textBlock.text.trim().replace(/```json|```/g, '').trim();
    const match = text.match(/\[[\s\S]*\]/);
    const items = match ? JSON.parse(match[0]) : [];
    console.log(`[${label}] found ${items.length} items`);

    return res.status(200).json(items);

  } catch (e) {
    console.error('Error:', e.message);
    return res.status(200).json([]);
  }
}
