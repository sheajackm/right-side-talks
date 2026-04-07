// MARKET DATA
const SYMBOLS = [
  {sym:'S&P 500',id:'%5EGSPC'},{sym:'DOW',id:'%5EDJI'},{sym:'NASDAQ',id:'%5EIXIC'},
  {sym:'BTC',id:'BTC-USD'},{sym:'ETH',id:'ETH-USD'},
  {sym:'AAPL',id:'AAPL'},{sym:'MSFT',id:'MSFT'},{sym:'NVDA',id:'NVDA'},
  {sym:'AMZN',id:'AMZN'},{sym:'GOOGL',id:'GOOGL'},{sym:'META',id:'META'},
  {sym:'TSLA',id:'TSLA'},{sym:'JPM',id:'JPM'},{sym:'LLY',id:'LLY'},
  {sym:'V',id:'V'},{sym:'UNH',id:'UNH'},{sym:'XOM',id:'XOM'},
  {sym:'MA',id:'MA'},{sym:'JNJ',id:'JNJ'},{sym:'PG',id:'PG'},
  {sym:'HD',id:'HD'},{sym:'AVGO',id:'AVGO'},{sym:'COST',id:'COST'},{sym:'MRK',id:'MRK'},
];

async function fetchQuote(s) {
  try {
    const r = await fetch(`/api/markets?symbol=${s.id}`, {signal: AbortSignal.timeout(8000)});
    if(!r.ok) return null;
    const d = await r.json();
    if(!d.price) return null;
    return {sym: s.sym, price: d.price, change: d.change, pct: d.pct};
  } catch(e) { return null; }
}

function fmtPrice(p, sym) {
  if(sym === 'BTC' || sym === 'ETH') return '$' + Math.round(p).toLocaleString('en-US');
  if(p > 10000) return p.toLocaleString('en-US',{maximumFractionDigits:0});
  return p.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2});
}

async function buildMarketItems() {
  const results = await Promise.allSettled(SYMBOLS.map(fetchQuote));
  const valid = results.filter(r => r.status==='fulfilled' && r.value).map(r => r.value);
  if(!valid.length) return '<span class="ticker-item"><span style="color:rgba(255,255,255,0.5)">Market data temporarily unavailable</span></span>';
  return valid.map(q => {
    const up = q.change >= 0;
    return `<span class="ticker-item"><span class="ticker-sym">${q.sym}</span>&nbsp;<span>${fmtPrice(q.price,q.sym)}</span>&nbsp;<span class="ticker-change ${up?'up':'down'}">${up?'▲':'▼'} ${Math.abs(q.pct).toFixed(2)}%</span></span>`;
  }).join('<span class="ticker-sep">|</span>');
}

// NEWS FEEDS
let allArticles = [];

async function fetchAllNews() {
  try {
    const r = await fetch('/api/news', {signal: AbortSignal.timeout(12000)});
    if(!r.ok) return [];
    const d = await r.json();
    return (d.items || []).map(i => ({
      id: i.id, label: i.label, badge: i.badge,
      title: i.title, link: i.link, date: new Date(i.date)
    }));
  } catch(e) { return []; }
}



function fmtDate(d) {
  const diff = Math.floor((new Date() - d) / 60000);
  if(diff < 60) return diff + 'm ago';
  if(diff < 1440) return Math.floor(diff/60) + 'h ago';
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}

function renderNews(filter) {
  const grid = document.getElementById('news-grid');
  const items = filter === 'all' ? allArticles : allArticles.filter(a => a.id === filter);
  if(!items.length) { grid.innerHTML = '<div class="news-loading">No headlines found.</div>'; return; }
  grid.innerHTML = items.slice(0,9).map(a => `
    <a class="news-card" href="${a.link}" target="_blank" rel="noopener">
      <div class="news-card-top"><span class="news-source-badge ${a.badge}">${a.label}</span><span class="news-card-date">${fmtDate(a.date)}</span></div>
      <h3>${a.title}</h3>
      <div class="news-card-footer"><span class="news-read-more">Read Full Story</span><span class="news-arrow">→</span></div>
    </a>`).join('');
}

window.filterNews = function(filter, btn) {
  document.querySelectorAll('.news-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderNews(filter);
};

async function buildNewsTickerItems() {
  return allArticles.slice(0,12).map(a =>
    `<span class="ticker-news-item"><span class="ticker-news-src">${a.label}</span><a href="${a.link}" target="_blank" rel="noopener">${a.title}</a></span>`
  ).join('');
}

// YOUTUBE
async function fetchYTByHandle() {
  try {
    const r = await fetch('/api/youtube', {signal: AbortSignal.timeout(10000)});
    if(!r.ok) return [];
    const d = await r.json();
    return d.items || [];
  } catch(e) { return []; }
}

async function fetchYouTubeVideos() {
  return [];
}

function ytVideoId(link) {
  const m = link.match(/[?&]v=([^&]+)/) || link.match(/youtu\.be\/([^?]+)/) || link.match(/\/shorts\/([^?]+)/);
  return m ? m[1] : null;
}

function fmtAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  if(diff === 0) return 'Today';
  if(diff === 1) return 'Yesterday';
  if(diff < 7) return diff + ' days ago';
  if(diff < 30) return Math.floor(diff/7) + ' weeks ago';
  if(diff < 365) return Math.floor(diff/30) + ' months ago';
  return Math.floor(diff/365) + ' years ago';
}

function renderYTCard(item, featured) {
  const vid = ytVideoId(item.link);
  const thumb = vid ? `https://i.ytimg.com/vi/${vid}/${featured?'maxresdefault':'hqdefault'}.jpg` : '';
  return `<a class="yt-card" href="${item.link}" target="_blank" rel="noopener">
    <div class="yt-thumb">
      <img src="${thumb}" alt="${item.title}" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/default/hqdefault.jpg'"/>
      <div class="yt-play-btn"><div class="yt-play-icon"><svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></div></div>
    </div>
    <div class="yt-info">
      <h3>${item.title}</h3>
      <div class="yt-meta"><span class="yt-views-badge">New</span><span>${fmtAgo(item.pubDate)}</span></div>
    </div>
  </a>`;
}

async function loadYouTubeVideos() {
  const featuredEl = document.getElementById('yt-featured');
  const gridEl = document.getElementById('yt-grid');
  featuredEl.innerHTML = '<div class="yt-loading" style="grid-column:1/-1">Loading videos&hellip;</div>';
  let videos = await fetchYTByHandle();
  if(!videos.length) videos = await fetchYouTubeVideos();
  if(!videos.length) {
    featuredEl.innerHTML = '';
    gridEl.innerHTML = `<div class="yt-loading">Videos temporarily unavailable. <a href="https://m.youtube.com/@RightSideTalks" target="_blank" style="color:var(--red)">Visit our channel →</a></div>`;
    return;
  }
  const [first, second, ...rest] = videos;
  featuredEl.innerHTML = renderYTCard(first, true) + (second ? renderYTCard(second, false) : '');
  gridEl.innerHTML = rest.slice(0,3).map(v => renderYTCard(v, false)).join('');
}

// CONTACT FORM
const FORMSPREE_ID = 'xeerdbaw';
window.submitContactForm = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('form-btn');
  const first = document.getElementById('f-first').value.trim();
  const last = document.getElementById('f-last').value.trim();
  const email = document.getElementById('f-email').value.trim();
  const interest = document.getElementById('f-interest').value;
  const message = document.getElementById('f-message').value.trim();
  if(!first || !email || !message) { alert('Please fill in your name, email, and message.'); return; }
  btn.textContent = 'Sending...'; btn.disabled = true;
  try {
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({name:`${first} ${last}`,email,interest:interest||'Not specified',message,_subject:`Right Side Talks — ${interest||'New Message'} from ${first} ${last}`})
    });
    if(res.ok) {
      document.getElementById('form-success').style.display = 'block';
      document.getElementById('contact-form-fields').style.display = 'none';
    } else { throw new Error(); }
  } catch(err) {
    document.getElementById('form-error').style.display = 'block';
    btn.textContent = 'Send Message'; btn.disabled = false;
  }
};

// EPISODE ARCHIVE
let allArchiveVideos = [];
let archiveVisible = 9;
let archiveFilter = 'all';

const SHOW_TAGS = [
  { key: 'rst', label: 'Right Side Talks', keywords: ['right side talks','rst','politics','conservative'] },
  { key: 'brief', label: 'The Brief', keywords: ['brief','news','update','daily'] },
  { key: 'campus', label: 'Campus Front', keywords: ['campus','college','university','student'] },
];

function detectShow(title) {
  const t = (title || '').toLowerCase();
  for(const s of SHOW_TAGS) {
    if(s.keywords.some(k => t.includes(k))) return s.key;
  }
  return 'rst';
}

function renderArchiveCard(item) {
  const vid = ytVideoId(item.link);
  const thumb = vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : '';
  const show = detectShow(item.title);
  const tagLabels = {rst:'Right Side Talks', brief:'The Brief', campus:'Campus Front'};
  return `<a class="archive-card" href="${item.link}" target="_blank" rel="noopener" data-show="${show}">
    <div class="archive-thumb">
      <img src="${thumb}" alt="${item.title}" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/default/hqdefault.jpg'"/>
      <div class="archive-play"><div class="archive-play-btn"><svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></div></div>
      <span class="archive-show-tag ${show}">${tagLabels[show]}</span>
    </div>
    <div class="archive-info">
      <h3>${item.title}</h3>
      <div class="archive-meta">${fmtAgo(item.pubDate)}</div>
    </div>
  </a>`;
}

function renderArchive() {
  const grid = document.getElementById('archive-grid');
  const moreBtn = document.getElementById('archive-more');
  const filtered = archiveFilter === 'all' ? allArchiveVideos : allArchiveVideos.filter(v => detectShow(v.title) === archiveFilter);
  if(!filtered.length) { grid.innerHTML = '<div class="archive-loading">No episodes found.</div>'; moreBtn.style.display='none'; return; }
  const visible = filtered.slice(0, archiveVisible);
  grid.innerHTML = visible.map(renderArchiveCard).join('');
  moreBtn.style.display = filtered.length > archiveVisible ? 'block' : 'none';
}

window.filterArchive = function(filter, btn) {
  archiveFilter = filter;
  archiveVisible = 9;
  document.querySelectorAll('.archive-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderArchive();
};

window.loadMoreArchive = function() {
  archiveVisible += 9;
  renderArchive();
};

async function loadArchive() {
  const grid = document.getElementById('archive-grid');
  let videos = await fetchYTByHandle();
  if(!videos.length) videos = await fetchYouTubeVideos();
  if(!videos.length) {
    grid.innerHTML = '<div class="archive-loading">Episodes temporarily unavailable. <a href="https://m.youtube.com/@RightSideTalks" target="_blank" style="color:var(--red)">Visit our channel →</a></div>';
    return;
  }
  allArchiveVideos = videos;
  renderArchive();
}

async function loadLatestVideos() {
  const grid = document.getElementById('latest-videos-grid');
  let videos = await fetchYTByHandle();
  if(!videos.length) videos = await fetchYouTubeVideos();
  if(!videos.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);font-family:var(--font-cond);font-size:14px;letter-spacing:0.1em;text-transform:uppercase;">Videos temporarily unavailable. <a href="https://m.youtube.com/@RightSideTalks" target="_blank" style="color:var(--red)">Visit our channel →</a></div>';
    return;
  }
  const latest = videos.slice(0, 3);
  grid.innerHTML = latest.map(item => {
    const vid = ytVideoId(item.link);
    const thumb = vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : '';
    return `<a href="${item.link}" target="_blank" rel="noopener" style="display:block;text-decoration:none;color:inherit;background:var(--grad-card);border:1px solid rgba(0,31,91,0.08);border-radius:12px;overflow:hidden;box-shadow:var(--shadow-sm);transition:box-shadow 0.25s,transform 0.2s;" onmouseover="this.style.boxShadow='0 20px 60px rgba(0,20,80,0.2)';this.style.transform='translateY(-5px)'" onmouseout="this.style.boxShadow='0 2px 12px rgba(0,20,80,0.08)';this.style.transform='translateY(0)'">
      <div style="position:relative;padding-top:56.25%;background:#0a0f20;overflow:hidden;">
        <img src="${thumb}" alt="${item.title}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.src='https://i.ytimg.com/vi/default/hqdefault.jpg'"/>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25);">
          <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#E8253F 0%,#A8152D 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(217,30,60,0.5);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" style="margin-left:4px;"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
        <div style="position:absolute;top:10px;right:10px;background:var(--grad-red);color:white;font-family:var(--font-cond);font-size:10px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:3px 10px;border-radius:3px;">New</div>
      </div>
      <div style="padding:1.25rem 1.5rem 1.5rem;">
        <h3 style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--text-dark);line-height:1.35;margin-bottom:0.5rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${item.title}</h3>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-family:var(--font-cond);font-size:12px;color:var(--text-muted);">${fmtAgo(item.pubDate)}</span>
          <span style="font-family:var(--font-cond);font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;background:var(--grad-red);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Watch on YouTube →</span>
        </div>
      </div>
    </a>`;
  }).join('');
}


const BLOG_POSTS = [
  {
    cat: 'Featured',
    title: 'Why Conservative Youth Media Matters More Than Ever',
    meta: 'Right Side Talks Staff &bull; 5 min read',
    body: `<p>America is at a crossroads. The mainstream media — once a pillar of objective journalism — has abandoned an entire generation of young Americans. What used to be the evening news is now a platform for left-wing ideology, corporate narratives, and cancel culture enforcement.</p>
<p>That's exactly why Right Side Talks exists.</p>
<p>We started this organization because we saw a void. Millions of young conservatives across this country — on campuses, in communities, in high schools and colleges — had no voice. No platform. No one speaking their language or representing their values in the media landscape.</p>
<p>We're changing that. One episode at a time. One conversation at a time. One young American at a time.</p>
<p>The left has dominated youth media for decades. TikTok, YouTube, podcasts — they've flooded every channel with progressive messaging designed to reshape how young people think about their country, their faith, and their future. And for too long, conservatives let it happen.</p>
<p>Not anymore. Right Side Talks is part of a national movement of young conservatives who are done sitting on the sidelines. We're taking the conversation back — unapologetically, fearlessly, and with the facts on our side.</p>
<p>If you believe in free speech, individual liberty, America first, and the values that built this nation — this is your home. Welcome to the right side.</p>`
  },
  {
    cat: 'Politics',
    title: 'The Campus Free Speech Crisis Nobody Is Talking About',
    meta: 'RST Staff &bull; 4 min read',
    body: `<p>Walk onto almost any college campus in America today and try to express a conservative opinion. See what happens. You'll be shouted down, reported to the administration, or quietly blacklisted from opportunities that should be open to everyone.</p>
<p>This isn't hypothetical. It's happening every day to conservative students at universities across the country — and the mainstream media barely covers it.</p>
<p>Campus Front, our show dedicated to higher education, has documented case after case of conservative students being silenced, penalized for their views, or abandoned by institutions that claim to champion "diversity and inclusion" — so long as that diversity doesn't include different ideas.</p>
<p>The First Amendment doesn't stop applying at the campus gate. Every student — liberal or conservative — deserves the right to speak freely, debate openly, and pursue truth without fear. We'll keep fighting for that right until it's a reality on every campus in America.</p>`
  },
  {
    cat: 'Culture',
    title: 'How the Left Lost the Next Generation',
    meta: 'RST Staff &bull; 6 min read',
    body: `<p>Something unexpected is happening in America. The generation that was supposed to be the most progressive in history is turning right — and the left has no idea how to stop it.</p>
<p>Poll after poll shows young men in particular are abandoning the Democratic Party in record numbers. Young women are following. The shift is seismic, and it's accelerating.</p>
<p>Why? Because the left overplayed its hand. When your political movement tells young Americans that their country is systemically evil, that their values are bigotry, and that their biology is a social construct — you lose people. Real people. People who love their country, love their families, and want a future worth building.</p>
<p>Conservative media — including organizations like Right Side Talks — has filled the void left by a progressive movement that forgot to actually listen to young Americans. We talk about real issues. Economic freedom. National security. The cost of living. The right to speak your mind.</p>
<p>The next generation isn't lost to the left. They're finding their way home — to the right side.</p>`
  },
  {
    cat: 'America First',
    title: 'Why We Still Believe in American Exceptionalism',
    meta: 'RST Staff &bull; 3 min read',
    body: `<p>They told us to be ashamed of our country. They rewrote our history. They tore down our monuments and said the American story was one of shame, not triumph.</p>
<p>We reject that — completely and without apology.</p>
<p>American exceptionalism is not a myth. It is the documented reality of a nation that, in less than 250 years, became the greatest force for freedom, prosperity, and human dignity the world has ever seen. A nation that freed a continent from fascism. A nation that put a man on the moon. A nation where the son of an immigrant can become President.</p>
<p>Is America perfect? No. No nation is. But the American experiment — built on individual liberty, limited government, and the rule of law — remains humanity's best answer to the question of how free people should govern themselves.</p>
<p>We believe that. We say it loudly. And we'll keep saying it on every platform we have.</p>`
  }
];

window.openBlog = function(idx) {
  const post = BLOG_POSTS[idx];
  document.getElementById('modal-cat').textContent = post.cat;
  document.getElementById('modal-title').textContent = post.title;
  document.getElementById('modal-meta').innerHTML = post.meta;
  document.getElementById('modal-body').innerHTML = post.body;
  document.getElementById('blog-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeBlog = function() {
  document.getElementById('blog-modal').classList.remove('open');
  document.body.style.overflow = '';
};

window.closeBlogIfOverlay = function(e) {
  if(e.target === document.getElementById('blog-modal')) closeBlog();
};

// POLL
let currentPollId = null;
let pollVotes = [0, 0, 0];

function pollStorageKey(pollId) {
  return 'rst_poll_' + pollId;
}

function updatePollUI(data, hasVoted) {
  const { pollId, question, options, votes } = data;
  pollVotes = votes;
  currentPollId = pollId;
  const total = votes.reduce((a,b) => a+b, 0);
  const maxV = Math.max(...votes);

  // Show breaking badge if applicable
  const badge = document.getElementById('poll-breaking-badge');
  if(badge) badge.style.display = data.breaking ? 'inline-flex' : 'none';

  // Update question and options text
  document.getElementById('poll-question').textContent = question;
  options.forEach((opt, i) => {
    const el = document.getElementById('opt-' + i);
    if(el) el.textContent = opt;
  });

  // Update bars and percentages
  votes.forEach((v, i) => {
    const pct = total > 0 ? Math.round((v / total) * 100) : 0;
    document.getElementById('bar-' + i).style.width = pct + '%';
    document.getElementById('pct-' + i).textContent = pct + '%';
    const opt = document.querySelectorAll('.poll-option')[i];
    if(hasVoted) {
      opt.classList.add('voted');
      opt.disabled = true;
      if(v === maxV && total > 0) opt.classList.add('winner');
    }
  });

  // Update stats
  document.getElementById('stat-votes').textContent = total > 0 ? total.toLocaleString() : '—';
  if(total > 0) {
    const winnerIdx = votes.indexOf(maxV);
    document.getElementById('stat-leading').textContent = options[winnerIdx];
    document.getElementById('poll-total').textContent = total.toLocaleString() + ' votes cast';
  } else {
    document.getElementById('stat-leading').textContent = 'Vote to see results';
    document.getElementById('poll-total').textContent = 'Cast your vote below';
  }
}

async function loadPollResults() {
  try {
    const r = await fetch('/api/poll');
    if(!r.ok) return;
    const d = await r.json();
    const hasVoted = localStorage.getItem(pollStorageKey(d.pollId)) !== null;
    updatePollUI(d, hasVoted);
  } catch(e) {}
}

window.castVote = async function(idx) {
  if(!currentPollId) return;
  const key = pollStorageKey(currentPollId);
  if(localStorage.getItem(key) !== null) return;
  localStorage.setItem(key, idx);
  // Optimistically update UI
  const newVotes = [...pollVotes];
  newVotes[idx]++;
  updatePollUI({ pollId: currentPollId, question: document.getElementById('poll-question').textContent, options: [0,1,2].map(i => document.getElementById('opt-'+i)?.textContent || ''), votes: newVotes }, true);
  try {
    const r = await fetch('/api/poll', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ idx, pollId: currentPollId })
    });
    if(r.ok) {
      const d = await r.json();
      updatePollUI(d, true);
    }
  } catch(e) {}
};

function initPoll() {
  loadPollResults();
}

// NEWSLETTER
window.submitNewsletter = async function() {
  const name = document.getElementById('nl-name').value.trim();
  const email = document.getElementById('nl-email').value.trim();
  if(!name || !email) { alert('Please enter your name and email.'); return; }
  if(!/\S+@\S+\.\S+/.test(email)) { alert('Please enter a valid email address.'); return; }
  const btn = document.querySelector('.newsletter-submit');
  btn.textContent = 'Subscribing...'; btn.disabled = true;
  try {
    // Sends via Formspree same endpoint — tagged as newsletter signup
    const res = await fetch('https://formspree.io/f/xeerdbaw', {
      method: 'POST',
      headers: {'Content-Type':'application/json','Accept':'application/json'},
      body: JSON.stringify({ name, email, _subject: `Newsletter Signup: ${name}`, type: 'Newsletter Signup' })
    });
    if(res.ok) {
      document.getElementById('newsletter-form-content').style.display = 'none';
      document.getElementById('newsletter-success').style.display = 'block';
    } else { throw new Error(); }
  } catch(e) {
    alert('Something went wrong. Please email us at our team to subscribe.');
    btn.textContent = 'Subscribe — It\'s Free'; btn.disabled = false;
  }
};

// COOKIE BANNER
window.dismissCookie = function(accepted) {
  try { localStorage.setItem('rst_cookie_consent', accepted ? 'accepted' : 'declined');
  } catch(e) {}
  document.getElementById('cookie-banner').style.display = 'none';
};

function closePrivacy() {
  document.getElementById('privacy-modal').style.display = 'none';
}

// PAGE INIT
(async function init() {
  // Cookie banner
  try {
    if(localStorage.getItem('rst_cookie_consent')) {
      document.getElementById('cookie-banner').style.display = 'none';
    }
  } catch(e) {}

  initPoll();

  // Build ticker
  const tickerTrack = document.getElementById('ticker-track');
  const [marketItems, newsItems] = await Promise.all([
    buildMarketItems(),
    (async () => {
      allArticles = await fetchAllNews();
      renderNews('all');
      return buildNewsTickerItems();
    })()
  ]);
  const combined = marketItems + '<span class="ticker-sep">★</span>' + newsItems;
  tickerTrack.innerHTML = combined + combined;

  await Promise.all([
    loadLatestVideos()
  ]);
})();
