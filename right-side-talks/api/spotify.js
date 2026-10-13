// Right Side Talks — Spotify podcast feed
// Pulls episodes for the Say It Anyway Podcast (Maura London) and returns them
// newest-first, shaped exactly like the items /api/youtube returns so the
// episode archive and homepage can merge both sources without special-casing.
//
// Why the Spotify Web API instead of an RSS feed: only the API exposes each
// episode's Spotify ID, which is what lets a card link straight to the episode
// on Spotify. A podcast RSS feed links to the hosting platform instead.
//
// SETUP (required before this returns anything):
//   1. Create an app at https://developer.spotify.com/dashboard
//   2. In Vercel → Project → Settings → Environment Variables, add:
//        SPOTIFY_CLIENT_ID      = <your app's Client ID>
//        SPOTIFY_CLIENT_SECRET  = <your app's Client Secret>
//   3. Redeploy.
// Until those are set this endpoint returns an empty list, so the archive keeps
// working with YouTube only rather than erroring.

const SHOWS = [
  { id: '65qy8vxG0AiQwOAI4hW0K9', name: 'Say It Anyway Podcast' }
];

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

const PER_SHOW = 50;   // Spotify's max page size
const MARKET = 'US';

// In-memory cache — persists between requests on the same warm server instance.
let cache = { items: null, timestamp: 0 };
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Access token cache (Spotify tokens last 1 hour).
let tokenCache = { token: null, expires: 0 };

// Last auth attempt's outcome, surfaced by ?debug=1 (never the secret itself).
let lastAuthNote = 'not attempted';

async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) return tokenCache.token;
  if (!CLIENT_ID || !CLIENT_SECRET) {
    lastAuthNote = `missing env vars (id:${CLIENT_ID ? 'set' : 'MISSING'}, secret:${CLIENT_SECRET ? 'set' : 'MISSING'})`;
    return null;
  }

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!r.ok) {
    let detail = '';
    try { detail = (await r.text()).slice(0, 200); } catch (e) {}
    lastAuthNote = `Spotify token HTTP ${r.status}: ${detail}`;
    return null;
  }

  const j = await r.json();
  if (!j.access_token) {
    lastAuthNote = 'token response had no access_token';
    return null;
  }
  lastAuthNote = 'ok';

  tokenCache = {
    token: j.access_token,
    // refresh a minute early to avoid races near expiry
    expires: Date.now() + ((j.expires_in || 3600) - 60) * 1000
  };
  return tokenCache.token;
}

// Pick the show's cover art — used as the thumbnail for every one of its
// episodes, so audio episodes get a consistent image like a video thumbnail.
function pickImage(images) {
  if (!Array.isArray(images) || !images.length) return '';
  // images come widest-first; prefer a mid size around 300px when present
  const mid = images.find(i => i.width && i.width <= 400 && i.width >= 200);
  return (mid || images[0]).url || '';
}

async function fetchShow(show, token) {
  const headers = { 'Authorization': `Bearer ${token}` };

  // Show details first — this is where the cover art comes from.
  const sr = await fetch(
    `https://api.spotify.com/v1/shows/${show.id}?market=${MARKET}`,
    { headers }
  );
  if (!sr.ok) return [];
  const sj = await sr.json();
  const cover = pickImage(sj.images);

  const er = await fetch(
    `https://api.spotify.com/v1/shows/${show.id}/episodes?market=${MARKET}&limit=${PER_SHOW}`,
    { headers }
  );
  if (!er.ok) return [];
  const ej = await er.json();
  const items = Array.isArray(ej.items) ? ej.items : [];

  return items.filter(Boolean).map(ep => ({
    title: ep.name,
    // link straight to the episode on Spotify
    link: (ep.external_urls && ep.external_urls.spotify)
      || `https://open.spotify.com/episode/${ep.id}`,
    pubDate: normalizeDate(ep.release_date, ep.release_date_precision),
    // every episode uses the show's cover art
    thumbnail: pickImage(ep.images) || cover,
    episodeId: ep.id,
    channel: show.name,
    source: 'spotify'
  }));
}

// Spotify returns release_date as YYYY, YYYY-MM or YYYY-MM-DD depending on
// precision. Normalize to an ISO timestamp so sorting against YouTube works.
function normalizeDate(d, precision) {
  if (!d) return new Date(0).toISOString();
  if (precision === 'year') return new Date(`${d}-01-01T00:00:00Z`).toISOString();
  if (precision === 'month') return new Date(`${d}-01T00:00:00Z`).toISOString();
  const dt = new Date(`${d}T00:00:00Z`);
  return isNaN(dt.getTime()) ? new Date(0).toISOString() : dt.toISOString();
}

module.exports = async (req, res) => {
  try {
    // Visit /api/spotify?debug=1 to see why a lookup failed. Reports whether the
    // env vars are visible and what Spotify replied — never the secret itself.
    if (req.query && req.query.debug) {
      const token = await getAccessToken();
      let showNote = 'not attempted';
      if (token) {
        try {
          const sr = await fetch(
            `https://api.spotify.com/v1/shows/${SHOWS[0].id}?market=${MARKET}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          showNote = sr.ok ? 'show lookup ok' : `show lookup HTTP ${sr.status}: ${(await sr.text()).slice(0, 200)}`;
        } catch (e) { showNote = 'show lookup threw: ' + e.message; }
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        clientIdPresent: !!CLIENT_ID,
        clientIdLength: CLIENT_ID ? CLIENT_ID.length : 0,
        clientSecretPresent: !!CLIENT_SECRET,
        clientSecretLength: CLIENT_SECRET ? CLIENT_SECRET.length : 0,
        tokenObtained: !!token,
        authNote: lastAuthNote,
        showNote,
        showId: SHOWS[0].id
      });
    }

    if (cache.items && (Date.now() - cache.timestamp) < CACHE_DURATION) {
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
      return res.status(200).json({ items: cache.items, cached: true });
    }

    const token = await getAccessToken();
    if (!token) {
      // Not configured yet (or auth failed) — return empty so callers degrade
      // gracefully instead of breaking the archive.
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ items: [], configured: false });
    }

    const results = await Promise.all(
      SHOWS.map(s => fetchShow(s, token).catch(() => []))
    );
    const items = results
      .flat()
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    if (items.length) cache = { items, timestamp: Date.now() };

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    return res.status(200).json({ items, configured: true });
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items: [], error: 'spotify_fetch_failed' });
  }
};
