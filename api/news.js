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
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        tool_choice: { type: 'any' },
        messages: [{
          role: 'user',
          content: `Do a web search for: ${query}

After searching, give me the 4 most relevant results as a JSON array only.
No explanation. No markdown. Just the raw JSON array like this:
[{"title":"Title here","url":"https://example.com","source":"Source Name","date":"2026-02-28"}]

Use today's date if the article date is unclear. Always return at least 1 result if anything relevant exists.`
        }],
      }),
    });

    const data = await response.json();

    // Log for debugging
    console.log('API response status:', data.type, 'content blocks:', data.content?.length);

    const textBlock = (data.content || []).find(b => b.type === 'text');

    if (!textBlock) {
      console.log('No text block found. Full response:', JSON.stringify(data).slice(0, 500));
      return res.status(200).json([]);
    }

    console.log('Text block:', textBlock.text.slice(0, 200));

    let text = textBlock.text.trim().replace(/```json|```/g, '').trim();
    const match = text.match(/\[[\s\S]*\]/);
    const items = match ? JSON.parse(match[0]) : [];

    return res.status(200).json(items);

  } catch (e) {
    console.error('Handler error:', e.message);
    return res.status(200).json([]);
  }
}
