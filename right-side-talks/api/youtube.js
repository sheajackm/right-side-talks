module.exports = async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const CHANNEL_ID = 'UCpbgusSKZhNJphR0HOHPJ0Q';

  // Hardcoded videos — update when new videos are uploaded
  const items = [
    {
      title: "Right Side Talks with Special Guests! Part 2",
      link: "https://www.youtube.com/watch?v=kObxEZT2mPE",
      pubDate: "2026-01-23T06:43:07+00:00",
      videoId: "kObxEZT2mPE"
    },
    {
      title: "Right Side Talks with Special Guests! Part 1",
      link: "https://www.youtube.com/watch?v=1YPE6lVgebc",
      pubDate: "2026-01-23T05:34:56+00:00",
      videoId: "1YPE6lVgebc"
    },
    {
      title: "Episode 3 Right Side Talks",
      link: "https://www.youtube.com/watch?v=7YVVcescVr8",
      pubDate: "2026-01-01T23:21:39+00:00",
      videoId: "7YVVcescVr8"
    },
    {
      title: "The America First Vs. MAGA Civil War | Right Side Talks EP. 2",
      link: "https://www.youtube.com/watch?v=tT2QNdeNEcY",
      pubDate: "2025-12-08T07:18:49+00:00",
      videoId: "tT2QNdeNEcY"
    },
    {
      title: "Right Side Talks Episode 1",
      link: "https://www.youtube.com/watch?v=JpuEpUtthxs",
      pubDate: "2025-11-25T02:17:52+00:00",
      videoId: "JpuEpUtthxs"
    }
  ];

  return res.status(200).json({ channelId: CHANNEL_ID, items });
};
