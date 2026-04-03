module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const FEEDS = [
    { id: 'fox',  label: 'FOX NEWS',   badge: 'badge-fox',  url: 'https://moxie.foxnews.com/google-publisher/politics.xml' },
    { id: 'wire', label: 'DAILY WIRE', badge: 'badge-wire', url: 'https://www.dailywire.com/feeds/rss.xml' },
    { id: 'nyp',  label: 'NY POST',    badge: 'badge-nyp',  url: 'https://nypost.com/politics/feed/' },
  ];

  async function fetchFeed(feed) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });
      if (!response.ok) return [];
      const xml = await response.text();
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 6) {
        const item = match[1];
        const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        if (titleMatch && linkMatch) {
          items.push({
            id: feed.id,
            label: feed.label,
            badge: feed.badge,
            title: titleMatch[1]
              .replace(/&amp;/g,'&').replace(/&lt;/g,'<')
              .replace(/&gt;/g,'>').replace(/&quot;/g,'"')
              .replace(/<!\[CDATA\[|\]\]>/g,'').trim(),
            link: linkMatch[1].trim(),
            date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString()
          });
        }
      }
      return items;
    } catch(e) {
      return [];
    }
  }

  try {
    const results = await Promise.all(FEEDS.map(fetchFeed));
    const allItems = results.flat().sort((a,b) => new Date(b.date) - new Date(a.date));
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ items: allItems });
  } catch(e) {
    return res.status(500).json({ error: e.message, items: [] });
  }
};
