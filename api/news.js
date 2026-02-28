export const config = { maxDuration: 30 };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FEEDS = {
  // China cross-border: regulatory + industry + WeChat Pay + Alipay
  china_reg: [
    'https://news.google.com/rss/search?q=%E4%BA%BA%E6%B0%91%E9%93%B6%E8%A1%8C+%E6%94%AF%E4%BB%98%E6%9C%BA%E6%9E%84&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    'https://news.google.com/rss/search?q=%E5%A4%96%E6%B1%87%E7%AE%A1%E7%90%86%E5%B1%80+%E8%B7%A8%E5%A2%83%E6%94%AF%E4%BB%98&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    'https://news.google.com/rss/search?q=%E6%94%AF%E4%BB%98%E7%89%8C%E7%85%A7+%E8%B7%A8%E5%A2%83+OR+%E6%94%AF%E4%BB%98%E6%9C%BA%E6%9E%84+%E5%A4%84%E7%BD%9A&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    'https://news.google.com/rss/search?q=China+cross-border+payment+regulation+OR+SAFE+payment+OR+PBoC+payment&hl=en-US&gl=US&ceid=US:en',
  ],
  china_industry: [
    'https://news.google.com/rss/search?q=%E5%BE%AE%E4%BF%A1%E6%94%AF%E4%BB%98+%E8%B7%A8%E5%A2%83&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    'https://news.google.com/rss/search?q=%E6%94%AF%E4%BB%98%E5%AE%9D+%E8%B7%A8%E5%A2%83&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    'https://news.google.com/rss/search?q=%E8%BF%9E%E8%BF%9E%E6%94%AF%E4%BB%98+%E8%B7%A8%E5%A2%83&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
    'https://news.google.com/rss/search?q=Alipay+cross-border+OR+WeChat+Pay+international+OR+Lianlian+payment&hl=en-US&gl=US&ceid=US:en',
  ],
  us: [
    'https://news.google.com/rss/search?q=OFAC+cross-border+payment+OR+FinCEN+payment+OR+CFPB+remittance&hl=en-US&gl=US&ceid=US:en',
  ],
  global: [
    'https://news.google.com/rss/search?q=SWIFT+cross-border+payment+OR+CBDC+cross-border+OR+G20+payments&hl=en-US&gl=US&ceid=US:en',
  ],
  industry: [
    'https://news.google.com/rss/search?q=cross-border+payments+fintech+industry&hl=en-US&gl=US&ceid=US:en',
    'https://chinabankingnews.com/feed/',
  ],
  enforcement: [
    'https://news.google.com/rss/search?q=fintech+payment+enforcement+OR+payment+penalty+OR+payment+lawsuit&hl=en-US&gl=US&ceid=US:en',
  ],
  chinareports: [
    'https://news.google.com/rss/search?q=%22PRC+financial+regulation%22+OR+%22non-bank+payment+institution%22+OR+%22payment+license+China%22&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=China+%22cross-border+payment%22+regulation+analysis+2025&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=%22non-banking+payment%22+China+OR+%22e-CNY+cross-border%22+OR+%22NetsUnion%22+regulation&hl=en-US&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=%E9%9D%9E%E9%93%B6%E8%A1%8C%E6%94%AF%E4%BB%98%E6%9C%BA%E6%9E%84+%E6%B3%95%E5%BE%8B+%E5%90%88%E8%A7%84&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
  ],
  regulators: [
    'https://news.google.com/rss/search?q=Federal+Reserve+payment+OR+CFPB+payment+OR+FinCEN+enforcement+OR+MAS+payment&hl=en-US&gl=US&ceid=US:en',
  ],
};

// How many items to return per feed
const LIMITS = {
  china_reg:     10,
  china_industry:10,
  default:        5,
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

  const limit = LIMITS[feed] || LIMITS.default;

  try {
    const responses = await Promise.all(
      feedUrls.map(async (url, i) => {
        try {
          const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' } });
          const text = await r.text();
          console.log(`[${feed}][${i}] status=${r.status} items=${(text.match(/<item>/g)||[]).length}`);
          return text;
        } catch(e) {
          console.log(`[${feed}][${i}] FAILED: ${e.message}`);
          return '';
        }
      })
    );

    const allItems = responses.flatMap(xml => parseRSS(xml));
    const seen = new Set();
    const unique = allItems.filter(item => {
      const key = item.title.slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    unique.sort((a, b) => new Date(b.date) - new Date(a.date));
    const items = unique.slice(0, limit);

    console.log(`[${feed}] returning ${items.length} items`);
    return res.status(200).json(items);
  } catch (e) {
    console.error(`[${feed}] error:`, e.message);
    return res.status(200).json([]);
  }
}
