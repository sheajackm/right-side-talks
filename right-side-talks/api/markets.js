module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'No symbol provided' });
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Yahoo Finance error' });
    }

    const data = await response.json();
    const result = data.chart?.result;

    if (!result?.[0]) {
      return res.status(404).json({ error: 'No data found' });
    }

    const meta = result[0].meta;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const pct = prev ? (change / prev) * 100 : 0;

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ price, prev, pct, change });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
