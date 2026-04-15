const PROJECT_ID = 'qy9hgtdq';
const DATASET = 'production';
const TOKEN = 'skdqbW5W2rA9HnPRTTMq6R0bzkPwFVGkCbbd4hSdp64BgrEedxFlLBKAbDvluFppjH327PoOIPoX56uP5xIncTIyZimvJfz3ADJ2xKnDzi3l0VqqnuOWivY3Gk5di5KEfKbkAmsTOPyDqtssloEb8ruVCaYi1DDztxjSObYL1TWaw9QRkwUF';

const AUTHOR_IMAGES = {
  'Jack Shea':        'https://rightsidetalks.com/images/jack.jpg',
  'Nick Cribbet':     'https://rightsidetalks.com/images/nick.jpg',
  'Cecelia Brown':    'https://rightsidetalks.com/images/cecelia.jpg',
  'Caleb Grubb':      'https://rightsidetalks.com/images/caleb.jpg',
  'Ryan McCombs':     'https://rightsidetalks.com/images/ryan.jpg',
  'Gavin Krauciunas': 'https://rightsidetalks.com/images/gavin.jpg',
  'John DePerno':     'https://rightsidetalks.com/images/john.jpg',
  'Austin DeLorme':   'https://rightsidetalks.com/images/austin.jpg',
};

function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

module.exports = async function(req, res) {
  const slug = (req.query && req.query.slug) || '';

  if (!slug) {
    return res.status(400).json({ error: 'Missing slug' });
  }

  const articleUrl = 'https://rightsidetalks.com/article.html?slug=' + encodeURIComponent(slug);

  let title = 'Right Side Talks';
  let description = 'Bold conservative opinion and commentary from the next generation of American voices.';
  let image = 'https://rightsidetalks.com/images/og-image.jpg';

  try {
    const query = encodeURIComponent(
      '*[_type == "article" && slug.current == "' + slug + '"][0]{title, excerpt, "author": author->name}'
    );
    const sanityUrl = 'https://' + PROJECT_ID + '.api.sanity.io/v2021-10-21/data/query/' + DATASET + '?query=' + query;
    const r = await fetch(sanityUrl, {
      headers: { Authorization: 'Bearer ' + TOKEN },
      signal: AbortSignal.timeout(6000)
    });
    if (r.ok) {
      const data = await r.json();
      const article = data.result;
      if (article && article.title) {
        title = article.title + ' — Right Side Talks';
        description = article.excerpt || description;
        image = AUTHOR_IMAGES[article.author] || image;
      }
    }
  } catch(e) {}

  const html = '<!DOCTYPE html><html><head>'
    + '<meta charset="UTF-8">'
    + '<title>' + esc(title) + '</title>'
    + '<meta name="description" content="' + esc(description) + '">'
    + '<meta property="og:type" content="article">'
    + '<meta property="og:site_name" content="Right Side Talks">'
    + '<meta property="og:title" content="' + esc(title) + '">'
    + '<meta property="og:description" content="' + esc(description) + '">'
    + '<meta property="og:image" content="' + image + '">'
    + '<meta property="og:url" content="' + articleUrl + '">'
    + '<meta name="twitter:card" content="summary_large_image">'
    + '<meta name="twitter:site" content="@rightsidetalks">'
    + '<meta name="twitter:title" content="' + esc(title) + '">'
    + '<meta name="twitter:description" content="' + esc(description) + '">'
    + '<meta name="twitter:image" content="' + image + '">'
    + '<meta http-equiv="refresh" content="0;url=' + articleUrl + '">'
    + '</head><body>'
    + '<script>window.location.replace("' + articleUrl + '");</script>'
    + '<a href="' + articleUrl + '">Click here to read the article</a>'
    + '</body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(html);
};
