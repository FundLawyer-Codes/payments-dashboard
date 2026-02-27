// ... keep your CORS and setup code the same ...

try {
  const { query } = await req.json();

  const prompt = `Search the web for the 4 most recent news articles about: ${query}
  Respond with ONLY a raw JSON array: [{"title":"Title","url":"URL","source":"Source","date":"YYYY-MM-DD"}]`;

  // 1. Initial request to Claude
  let response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      // Use 'tool_choice' to force Claude to actually use the search tool
      tool_choice: { type: 'tool', name: 'web_search' }, 
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  let data = await response.json();

  // 2. CHECK: If Claude wants to use the tool, we need to let the built-in search run
  // Note: On Vercel Edge with Anthropic's native web_search, 
  // you often need to check the 'stop_reason'
  
  if (data.stop_reason === 'tool_use') {
    // In the latest Anthropic API, for native tools, 
    // you may need to send a second request or ensure the first one 
    // is configured to "execute and return".
    // A simpler fix for this specific dashboard:
    // Change the prompt to NOT use the tool if the tool loop is too complex for your current setup.
  }

  const textBlock = (data.content || []).find(b => b.type === 'text');
  
  // ... rest of your parsing logic ...
