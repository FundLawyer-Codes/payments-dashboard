export const config = { maxDuration: 30 };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FEEDS = {
  china:       'https://news.google.com/rss/search?q=China+SAFE+PBoC+CIPS+RMB+cross-border+payment+regulation&hl=en-US&gl=US&ceid=US:en',
  us:          'https://news.google.com/rss/search?q=OFAC+sanctions+cross-border+payment+OR+FinCEN+AML+payment+OR+CFPB+remittance&hl=en-US&gl=US&ceid=US:en',
  global:      'https://news.google.com/rss/search?q=G20+SWIFT+ISO+20022+CBDC+mBridge+cross-border+payment&hl=en-US&gl=US&ceid=US:en',
  industry:    'https://news.google.com/rss/search?q=cross-border+payments+fintech+industry+market&hl=en-US&gl=US&ceid=US:en',
  enforcement: 'https://news.google.com/rss/search?q=payments+fintech+enforcement+penalty+lawsuit+compliance&hl=en-US&gl=US&ceid=US:en',
  regulators:  'https://news.google.com/rss/search?q=Federal+Reserve+payments+OR+CFPB+payments+OR+FinCEN+payments+OR+OCC+bank+OR+MAS+payments&hl=en-US&gl=US&ceid=US:en',
};

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title  = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || '';
    const url    = (item.match(/<link>(.*?)<\/link>/) || item.match(/<guid>(.*?)<\/guid>/))?.[1] || '';
    const date   = (item.match(/<pubDate>(.*?)<\/pubDate>/))?.[1] || '';
    const source = (item.match(/<source[^>]*>(.*?)<\/source>/))?.[1] || 'Google News';
    if (title && url) {
      items.push({
        title: title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"),
        url: url.trim(),
        source,
        date: date ? new Date(date).toISOString().split('T')[0] : '',
      });
    }
  }
  return items.slice(0, 5);
}

export default async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { feed } = req.query;
  const feedUrl = FEEDS[feed];
  if (!feedUrl) return res.status(400).json({ error: 'Unknown feed' });

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' }
    });
    const xml = await response.text();
    const items = parseRSS(xml);
    console.log(`[${feed}] fetched ${items.length} items`);
    return res.status(200).json(items);
  } catch (e) {
    console.error(`[${feed}] error:`, e.message);
    return res.status(200).json([]);
  }
}
