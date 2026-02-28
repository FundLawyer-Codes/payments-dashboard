export const config = { maxDuration: 30 };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Each feed can have multiple URLs — results are merged and deduplicated
const FEEDS = {
  china: [
    'https://news.google.com/rss/search?q=China+cross-border+payment+OR+China+payment+regulation+OR+CIPS+payment&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=%E4%BA%BA%E6%B0%91%E9%93%B6%E8%A1%8C+%E8%B7%A8%E5%A2%83%E6%94%AF%E4%BB%98&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    'https://news.google.com/rss/search?q=%E4%BA%BA%E6%B0%91%E9%93%B6%E8%A1%8C+%E6%94%AF%E4%BB%98%E6%9C%BA%E6%9E%84&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    'https://news.google.com/rss/search?q=%E5%A4%96%E6%B1%87%E7%AE%A1%E7%90%86%E5%B1%80+%E6%94%AF%E4%BB%98%E6%9C%BA%E6%9E%84&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
  ],
  us: [
    'https://news.google.com/rss/search?q=OFAC+cross-border+payment+OR+FinCEN+payment+OR+CFPB+remittance&hl=en-US&gl=US&ceid=US:en',
  ],
  global: [
    'https://news.google.com/rss/search?q=SWIFT+cross-border+payment+OR+CBDC+cross-border+OR+G20+payments&hl=en-US&gl=US&ceid=US:en',
  ],
  industry: [
    'https://news.google.com/rss/search?q=cross-border+payments+fintech+industry&hl=en-US&gl=US&ceid=US:en',
  ],
  enforcement: [
    'https://news.google.com/rss/search?q=fintech+payment+enforcement+OR+payment+penalty+OR+payment+lawsuit&hl=en-US&gl=US&ceid=US:en',
  ],
  chinareports: [
    'https://news.google.com/rss/search?q=IFLR+China+payment+OR+Fangda+fintech+OR+Han+Kun+fintech+OR+JunHe+payment+OR+King+Wood+Mallesons+payment&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=Cooley+payment+OR+Latham+Watkins+payment+OR+Debevoise+payment+OR+Morrison+Foerster+fintech+OR+Covington+payment+OR+Davis+Polk+payment&hl=en-US&gl=US&ceid=US:en',
  ],
  regulators: [
    'https://news.google.com/rss/search?q=Federal+Reserve+payment+OR+CFPB+payment+OR+FinCEN+enforcement+OR+MAS+payment&hl=en-US&gl=US&ceid=US:en',
  ],
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
    if (!title || !url) continue;
    items.push({
      title: title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"),
      url: url.trim(),
      source,
      date: date ? new Date(date).toISOString().split('T')[0] : '',
    });
  }
  return items;
}

export default async function handler(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { feed } = req.query;
  const feedUrls = FEEDS[feed];
  if (!feedUrls) return res.status(400).json({ error: 'Unknown feed' });

  try {
    // Fetch all URLs for this feed in parallel
    const responses = await Promise.all(
      feedUrls.map(async (url, i) => {
        try {
          const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' } });
          const text = await r.text();
          const itemCount = (text.match(/<item>/g) || []).length;
          console.log(`[${feed}][${i}] status=${r.status} items=${itemCount} url=${url.slice(0,80)}`);
          return text;
        } catch(e) {
          console.log(`[${feed}][${i}] FAILED: ${e.message} url=${url.slice(0,80)}`);
          return '';
        }
      })
    );

    // Parse and merge, deduplicate by title, sort by date, take top 5
    const allItems = responses.flatMap(xml => parseRSS(xml));
    const seen = new Set();
    const unique = allItems.filter(item => {
      const key = item.title.slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    unique.sort((a, b) => new Date(b.date) - new Date(a.date));
    const items = unique.slice(0, 5);

    console.log(`[${feed}] fetched ${items.length} items from ${feedUrls.length} feeds`);
    return res.status(200).json(items);
  } catch (e) {
    console.error(`[${feed}] error:`, e.message);
    return res.status(200).json([]);
  }
}
