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
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        }],
        tool_choice: { type: 'any' },
        messages: [{
          role: 'user',
          content: `You are a research assistant for an in-house lawyer at a cross-border payments company focused on China corridors.

Find 4 recent news articles (last 60 days) about: "${label}"
Search query: ${query}

Return ONLY a raw JSON array:
[{"title":"...","url":"https://...","source":"Bloomberg/Reuters/etc","date":"YYYY-MM-DD"}]

No markdown, no explanation. If nothing found: []`
        }],
      }),
    });

    const data = await response.json();
    console.log(`[${label}] stop:`, data.stop_reason, 'error:', data.error?.message, 'blocks:', data.content?.map(b=>b.type).join(','));

    const textBlock = (data.content || []).find(b => b.type === 'text');
    if (!textBlock) return res.status(200).json([]);

    let text = textBlock.text.trim().replace(/```json|```/g, '').trim();
    const match = text.match(/\[[\s\S]*\]/);
    const items = match ? JSON.parse(match[0]) : [];
    console.log(`[${label}] found:`, items.length);

    return res.status(200).json(items);

  } catch (e) {
    console.error('Error:', e.message);
    return res.status(200).json([]);
  }
}
