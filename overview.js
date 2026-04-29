(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getImg(images, preferred) {
    if (!Array.isArray(images)) return '';
    const order = [preferred, 'large', 'extralarge', 'medium', 'small'].filter(Boolean);
    for (const size of order) {
      const found = images.find(i => i.size === size);
      if (found && found['#text']) return found['#text'];
    }
    return '';
  }

  function fmtNum(n) {
    return Number(n).toLocaleString();
  }

  function periodDateRange(key) {
    if (key === 'all') return 'All Time';
    const days = { week: 7, month: 30, '3m': 90, '6m': 180, '12m': 365 }[key] || 30;
    const now  = new Date();
    const from = new Date(now.getTime() - days * 86_400_000);
    const fmt  = d => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    return `${fmt(from)} – ${fmt(now)}`;
  }

  // ── DOM refs ─────────────────────────────────────────────────────────────

  const ovTitle       = document.getElementById('ov-title');
  const metaRange     = document.getElementById('ov-meta-range');
  const metaScrobbles = document.getElementById('ov-meta-scrobbles');
  const cardAlbums    = document.getElementById('card-albums');
  const cardArtists   = document.getElementById('card-artists');
  const cardTracks    = document.getElementById('card-tracks');
  const picker        = document.getElementById('ov-date-picker');
  const btn           = document.getElementById('ov-date-btn');
  const label         = document.getElementById('ov-date-label');
  const menu          = document.getElementById('ov-date-menu');

  const chartSvg     = document.querySelector('.chart-svg');
  const chartWrapper = document.querySelector('.chart-wrapper');

  // Chart spinner — appended once, shown/hidden via [hidden]
  const chartLoader = document.createElement('div');
  chartLoader.className = 'chart-loader';
  chartLoader.innerHTML = '<div class="chart-loader-spinner"></div>';
  chartLoader.hidden = true;
  if (chartWrapper) chartWrapper.appendChild(chartLoader);

  // Tooltip — lives on <body> to escape card's overflow:hidden
  const chartTooltip = document.createElement('div');
  chartTooltip.className = 'chart-tooltip';
  chartTooltip.innerHTML = '<p class="chart-tooltip-label"></p><p class="chart-tooltip-value"></p>';
  document.body.appendChild(chartTooltip);

  let currentSeries = [];

  const DATE_LABELS = {
    week: 'Week', month: 'Month', '3m': '3 Months',
    '6m': '6 Months', '12m': '12 Months', all: 'All Time',
  };

  const username = sessionStorage.getItem('lfm_username');

  // ── Sub-header username ───────────────────────────────────────────────────

  if (ovTitle && username) ovTitle.textContent = `${username}’s focus.fm`;

  // ── User avatar from Last.fm ──────────────────────────────────────────────

  if (username) {
    LastFM.getUserInfo(username).then(data => {
      const img     = getImg(data.user.image, 'medium');
      const avatarEl = document.getElementById('user-avatar');
      if (img && avatarEl) {
        avatarEl.style.backgroundImage    = `url('${img}')`;
        avatarEl.style.backgroundSize     = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
      }
    }).catch(() => {});
  }

  // ── Date picker ───────────────────────────────────────────────────────────

  let currentPeriod = 'month';

  btn.addEventListener('click', e => {
    e.stopPropagation();
    picker.classList.toggle('open');
  });

  menu.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const val = li.dataset.value;
    menu.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
    li.classList.add('selected');
    label.textContent = DATE_LABELS[val] || li.textContent;
    picker.classList.remove('open');
    if (val !== currentPeriod) {
      currentPeriod = val;
      loadData(val);
    }
  });

  document.addEventListener('click', () => picker.classList.remove('open'));

  // ── Genre filter ──────────────────────────────────────────────────────────

  document.querySelectorAll('.genre-btn').forEach(gb => {
    gb.addEventListener('click', () => {
      document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
      gb.classList.add('active');
    });
  });

  // ── Skeleton / error ──────────────────────────────────────────────────────

  function showSkeleton(list) {
    list.innerHTML = Array.from({ length: 5 }, () => `
      <li class="top5-item">
        <div class="top5-thumb top5-skel"></div>
        <div class="top5-info">
          <div class="top5-skel-bar"></div>
          <div class="top5-skel-bar"></div>
          <div class="top5-skel-bar"></div>
        </div>
      </li>`).join('');
  }

  function showError(list, msg) {
    list.innerHTML = `<li class="top5-item top5-error">${esc(msg)}</li>`;
  }

  // ── Renderers ─────────────────────────────────────────────────────────────

  function renderAlbums(data) {
    const list    = cardAlbums.querySelector('.top5-list');
    const totalEl = cardAlbums.querySelector('.top5-total');
    const albums  = data.topalbums.album || [];
    const total   = data.topalbums['@attr']?.total;
    if (total) totalEl.textContent = `${fmtNum(total)} Total`;
    list.innerHTML = albums.map(a => {
      const img = getImg(a.image, 'medium');
      return `
        <li class="top5-item">
          <div class="top5-thumb"${img ? ` style="background-image:url('${esc(img)}');background-size:cover;background-position:center;"` : ''}></div>
          <div class="top5-info">
            <p class="top5-name">${esc(a.name)}</p>
            <p class="top5-secondary">${esc(a.artist.name)}</p>
            <p class="top5-tertiary">${fmtNum(a.playcount)} scrobbles</p>
          </div>
        </li>`;
    }).join('');
  }

  function renderArtists(data) {
    const list    = cardArtists.querySelector('.top5-list');
    const totalEl = cardArtists.querySelector('.top5-total');
    const artists = data.topartists.artist || [];
    const total   = data.topartists['@attr']?.total;
    if (total) totalEl.textContent = `${fmtNum(total)} Total`;
    list.innerHTML = artists.map(a => {
      const rank = a['@attr']?.rank;
      return `
        <li class="top5-item">
          <div class="top5-thumb"></div>
          <div class="top5-info">
            <p class="top5-name">${esc(a.name)}</p>
            <p class="top5-secondary">${fmtNum(a.playcount)} scrobbles</p>
            ${rank ? `<p class="top5-tertiary">#${rank} this period</p>` : ''}
          </div>
        </li>`;
    }).join('');

    const thumbs = list.querySelectorAll('.top5-thumb');
    artists.forEach((a, i) => {
      LastFM.getiTunesImage(a.name, 'album').then(url => {
        if (url && thumbs[i]) {
          thumbs[i].style.backgroundImage    = `url('${url}')`;
          thumbs[i].style.backgroundSize     = 'cover';
          thumbs[i].style.backgroundPosition = 'center';
        }
      }).catch(() => {});
    });
  }

  function renderTracks(data) {
    const list    = cardTracks.querySelector('.top5-list');
    const totalEl = cardTracks.querySelector('.top5-total');
    const tracks  = data.toptracks.track || [];
    const total   = data.toptracks['@attr']?.total;
    if (total) totalEl.textContent = `${fmtNum(total)} Total`;
    list.innerHTML = tracks.map(t => {
      return `
        <li class="top5-item">
          <div class="top5-thumb"></div>
          <div class="top5-info">
            <p class="top5-name">${esc(t.name)}</p>
            <p class="top5-secondary">${esc(t.artist.name)}</p>
            <p class="top5-tertiary">${fmtNum(t.playcount)} scrobbles</p>
          </div>
        </li>`;
    }).join('');

    const thumbs = list.querySelectorAll('.top5-thumb');
    tracks.forEach((t, i) => {
      LastFM.getiTunesImage(`${t.artist.name} ${t.name}`, 'song').then(url => {
        if (url && thumbs[i]) {
          thumbs[i].style.backgroundImage    = `url('${url}')`;
          thumbs[i].style.backgroundSize     = 'cover';
          thumbs[i].style.backgroundPosition = 'center';
        }
      }).catch(() => {});
    });
  }

  // ── Chart helpers ─────────────────────────────────────────────────────────

  const CHART_W = 1060, CHART_H = 200, CHART_ML = 42, CHART_MR = 8, CHART_MT = 12, CHART_MB = 24;
  const CHART_CW = CHART_W - CHART_ML - CHART_MR;
  const CHART_CH = CHART_H - CHART_MT - CHART_MB;
  const CHART_STEPS = 4;

  function niceMax(val) {
    if (val <= 0) return CHART_STEPS;
    const rawStep  = val / CHART_STEPS;
    const mag      = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const n        = rawStep / mag;
    const niceStep = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return niceStep * mag * CHART_STEPS;
  }

  function chartXFor(i, len) {
    return CHART_ML + (len < 2 ? CHART_CW / 2 : (i / (len - 1)) * CHART_CW);
  }

  function chartYFor(v, yMax) {
    return CHART_MT + CHART_CH * (1 - v / yMax);
  }

  function skeletonChartSVG() {
    let lines = '';
    for (let s = 0; s <= CHART_STEPS; s++) {
      const y = (CHART_MT + CHART_CH * (1 - s / CHART_STEPS)).toFixed(1);
      lines += `<line x1="${CHART_ML}" y1="${y}" x2="${CHART_W}" y2="${y}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="4 4"/>`;
    }
    return lines;
  }

  function buildChartSVG(series) {
    const yMax  = niceMax(Math.max(...series.map(s => s.count), 1));
    const baseY = CHART_MT + CHART_CH;

    let gridLines = '', yLabels = '';
    for (let s = 0; s <= CHART_STEPS; s++) {
      const val = (yMax / CHART_STEPS) * s;
      const y   = chartYFor(val, yMax).toFixed(1);
      gridLines += `<line x1="${CHART_ML}" y1="${y}" x2="${CHART_W}" y2="${y}" stroke="#e0e0e0" stroke-width="1" stroke-dasharray="4 4"/>`;
      yLabels   += `<text x="${CHART_ML - 4}" y="${(parseFloat(y) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#525252" font-family="system-ui,sans-serif">${Math.round(val)}</text>`;
    }

    const labelN = Math.min(6, series.length);
    let xLabels = '';
    for (let li = 0; li < labelN; li++) {
      const idx = labelN < 2 ? 0 : Math.round(li / (labelN - 1) * (series.length - 1));
      xLabels += `<text x="${chartXFor(idx, series.length).toFixed(1)}" y="${CHART_H - 4}" text-anchor="middle" font-size="11" fill="#525252" font-family="system-ui,sans-serif">${series[idx].label}</text>`;
    }

    const pts = series.map((s, i) => [chartXFor(i, series.length), chartYFor(s.count, yMax)]);
    let linePath = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const dx = (pts[i][0] - pts[i-1][0]) * 0.4;
      linePath += ` C ${(pts[i-1][0]+dx).toFixed(1)},${pts[i-1][1].toFixed(1)} ${(pts[i][0]-dx).toFixed(1)},${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
    }
    const areaPath = `${linePath} L ${pts[pts.length-1][0].toFixed(1)},${baseY.toFixed(1)} L ${pts[0][0].toFixed(1)},${baseY.toFixed(1)} Z`;

    return `
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d92323" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#d92323" stop-opacity="0.01"/>
        </linearGradient>
      </defs>
      ${gridLines}${yLabels}${xLabels}
      <path d="${areaPath}" fill="url(#areaGrad)"/>
      <path d="${linePath}" fill="none" stroke="#d92323" stroke-width="2"/>
      <line class="chart-xhair-line" x1="0" x2="0" y1="${CHART_MT}" y2="${CHART_MT + CHART_CH}" stroke="#222" stroke-width="1" stroke-dasharray="3 3" opacity="0.4" style="display:none"/>
      <circle class="chart-xhair-dot" cx="0" cy="0" r="4" fill="#d92323" stroke="white" stroke-width="2" style="display:none"/>`;
  }

  // ── Chart hover interaction ────────────────────────────────────────────────

  function onChartMouseMove(e) {
    if (!currentSeries.length) return;

    const pt = chartSvg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(chartSvg.getScreenCTM().inverse());

    let nearestIdx = 0, nearestDist = Infinity;
    currentSeries.forEach((_, i) => {
      const dist = Math.abs(svgPt.x - chartXFor(i, currentSeries.length));
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    });

    const yMax  = niceMax(Math.max(...currentSeries.map(s => s.count), 1));
    const dataX = chartXFor(nearestIdx, currentSeries.length);
    const dataY = chartYFor(currentSeries[nearestIdx].count, yMax);

    const xhLine = chartSvg.querySelector('.chart-xhair-line');
    const xhDot  = chartSvg.querySelector('.chart-xhair-dot');
    if (xhLine) { xhLine.setAttribute('x1', dataX); xhLine.setAttribute('x2', dataX); xhLine.style.display = ''; }
    if (xhDot)  { xhDot.setAttribute('cx', dataX); xhDot.setAttribute('cy', dataY); xhDot.style.display = ''; }

    const sPt = chartSvg.createSVGPoint();
    sPt.x = dataX; sPt.y = dataY;
    const screen = sPt.matrixTransform(chartSvg.getScreenCTM());

    chartTooltip.querySelector('.chart-tooltip-label').textContent = currentSeries[nearestIdx].label;
    chartTooltip.querySelector('.chart-tooltip-value').textContent = `${currentSeries[nearestIdx].count.toLocaleString()} scrobbles`;
    chartTooltip.style.display = 'block';
    chartTooltip.style.left    = `${screen.x}px`;
    chartTooltip.style.top     = `${screen.y}px`;
  }

  function onChartMouseLeave() {
    const xhLine = chartSvg?.querySelector('.chart-xhair-line');
    const xhDot  = chartSvg?.querySelector('.chart-xhair-dot');
    if (xhLine) xhLine.style.display = 'none';
    if (xhDot)  xhDot.style.display  = 'none';
    chartTooltip.style.display = 'none';
  }

  if (chartSvg) {
    chartSvg.addEventListener('mousemove', onChartMouseMove);
    chartSvg.addEventListener('mouseleave', onChartMouseLeave);
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  let loadGen = 0;

  async function loadData(periodKey) {
    const gen = ++loadGen;

    metaRange.textContent = periodDateRange(periodKey);
    metaScrobbles.innerHTML = '<span class="ov-meta-skel"></span>';

    showSkeleton(cardAlbums.querySelector('.top5-list'));
    showSkeleton(cardArtists.querySelector('.top5-list'));
    showSkeleton(cardTracks.querySelector('.top5-list'));
    cardAlbums.querySelector('.top5-total').textContent  = '';
    cardArtists.querySelector('.top5-total').textContent = '';
    cardTracks.querySelector('.top5-total').textContent  = '';
    currentSeries = [];
    if (chartSvg) chartSvg.innerHTML = skeletonChartSVG();
    chartLoader.hidden = false;

    const [albumsR, artistsR, tracksR, countR] = await Promise.allSettled([
      LastFM.getTopAlbums(username, periodKey),
      LastFM.getTopArtists(username, periodKey),
      LastFM.getTopTracks(username, periodKey),
      LastFM.getScrobbleCount(username, periodKey),
    ]);

    if (albumsR.status  === 'fulfilled') renderAlbums(albumsR.value);
    else showError(cardAlbums.querySelector('.top5-list'),   albumsR.reason?.message  || 'Failed to load');

    if (artistsR.status === 'fulfilled') renderArtists(artistsR.value);
    else showError(cardArtists.querySelector('.top5-list'), artistsR.reason?.message || 'Failed to load');

    if (tracksR.status  === 'fulfilled') renderTracks(tracksR.value);
    else showError(cardTracks.querySelector('.top5-list'),   tracksR.reason?.message  || 'Failed to load');

    if (countR.status === 'fulfilled') {
      metaScrobbles.innerHTML = `<a href="scrobbles.html">${fmtNum(countR.value)} scrobbles</a>`;
    } else {
      metaScrobbles.textContent = '';
    }

    try {
      const series = await LastFM.getScrobbleTimeSeries(username, periodKey);
      if (gen !== loadGen) return;
      if (chartSvg && series.length) {
        chartSvg.innerHTML = buildChartSVG(series);
        currentSeries = series;
      }
    } catch {
      // leave skeleton on error
    } finally {
      chartLoader.hidden = true;
    }
  }

  loadData(currentPeriod);
})();
