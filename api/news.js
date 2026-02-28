export const config = { maxDuration: 60 };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { query } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Search the web for 4 recent news articles about: ${query}

Return ONLY a JSON array, no markdown, no explanation:
[{"title":"...","url":"https://...","source":"...","date":"YYYY-MM-DD"}]

If nothing found return: []`
        }],
      }),
    });

    const data = await response.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');

    if (!textBlock) return res.status(200).json([]);

    let text = textBlock.text.trim().replace(/```json|```/g, '').trim();
    const match = text.match(/\[[\s\S]*?\]/);
    const items = match ? JSON.parse(match[0]) : [];

    return res.status(200).json(items);

  } catch (e) {
    console.error(e);
    return res.status(200).json([]);
  }
}
