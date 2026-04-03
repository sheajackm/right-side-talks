module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const CHANNEL_ID = 'UCnSYA_NBsCrIpMFmJBKFQpA';

  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const response = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'RSS fetch failed', items: [] });
    }

    const rssText = await response.text();
    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(rssText)) !== null && entries.length < 10) {
      const entry = match[1];
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/);
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
      const videoIdMatch = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/);

      if (titleMatch && linkMatch) {
        entries.push({
          title: titleMatch[1]
            .replace(/&amp;/g,'&').replace(/&lt;/g,'<')
            .replace(/&gt;/g,'>').replace(/&quot;/g,'"')
            .replace(/&#39;/g,"'").trim(),
          link: linkMatch[1],
          pubDate: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
          videoId: videoIdMatch ? videoIdMatch[1] : null
        });
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({ channelId: CHANNEL_ID, items: entries });

  } catch (e) {
    return res.status(500).json({ error: e.message, items: [] });
  }
};
