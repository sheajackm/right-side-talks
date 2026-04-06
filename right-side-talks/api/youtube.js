const CHANNEL_ID = 'UCpbgusSKZhNJphR0HOHPJ0Q';
const API_KEY = 'AIzaSyCI_k6-RXSJEs9pGVWeTxVrc_Ec_qF6ix4';

const FALLBACK = [
  { title: "Right Side Talks with Special Guests! Part 2", link: "https://www.youtube.com/watch?v=kObxEZT2mPE", pubDate: "2026-01-23T06:43:07Z", videoId: "kObxEZT2mPE", thumbnail: "https://i.ytimg.com/vi/kObxEZT2mPE/hqdefault.jpg" },
  { title: "Right Side Talks with Special Guests! Part 1", link: "https://www.youtube.com/watch?v=1YPE6lVgebc", pubDate: "2026-01-23T05:34:56Z", videoId: "1YPE6lVgebc", thumbnail: "https://i.ytimg.com/vi/1YPE6lVgebc/hqdefault.jpg" },
  { title: "Episode 3 Right Side Talks", link: "https://www.youtube.com/watch?v=7YVVcescVr8", pubDate: "2026-01-01T23:21:39Z", videoId: "7YVVcescVr8", thumbnail: "https://i.ytimg.com/vi/7YVVcescVr8/hqdefault.jpg" },
  { title: "The America First Vs. MAGA Civil War | Right Side Talks EP. 2", link: "https://www.youtube.com/watch?v=tT2QNdeNEcY", pubDate: "2025-12-08T07:18:49Z", videoId: "tT2QNdeNEcY", thumbnail: "https://i.ytimg.com/vi/tT2QNdeNEcY/hqdefault.jpg" },
  { title: "Right Side Talks Episode 1", link: "https://www.youtube.com/watch?v=JpuEpUtthxs", pubDate: "2025-11-25T02:17:52Z", videoId: "JpuEpUtthxs", thumbnail: "https://i.ytimg.com/vi/JpuEpUtthxs/hqdefault.jpg" }
];

// In-memory cache — persists between requests on the same server instance
let cache = { items: null, timestamp: 0 };
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Return cached data if still fresh
  const now = Date.now();
  if (cache.items && (now - cache.timestamp) < CACHE_DURATION) {
    res.setHeader('Cache-Control', 'public, max-age=21600');
    return res.status(200).json({ channelId: CHANNEL_ID, items: cache.items, source: 'cache' });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet&order=date&maxResults=10&type=video`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();

    if (!r.ok || data.error) {
      // Return cached data if available, otherwise fallback
      const items = cache.items || FALLBACK;
      return res.status(200).json({ channelId: CHANNEL_ID, items, source: 'fallback' });
    }

    const items = (data.items || []).map(item => ({
      title: item.snippet.title,
      link: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      pubDate: item.snippet.publishedAt,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
    }));

    if (items.length) {
      // Update cache
      cache = { items, timestamp: now };
    }

    res.setHeader('Cache-Control', 'public, max-age=21600');
    return res.status(200).json({ channelId: CHANNEL_ID, items: items.length ? items : FALLBACK, source: 'api' });

  } catch(e) {
    const items = cache.items || FALLBACK;
    return res.status(200).json({ channelId: CHANNEL_ID, items, source: 'fallback' });
  }
};
