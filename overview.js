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
      const img  = getImg(a.image, 'medium');
      const rank = a['@attr']?.rank;
      return `
        <li class="top5-item">
          <div class="top5-thumb"${img ? ` style="background-image:url('${esc(img)}');background-size:cover;background-position:center;"` : ''}></div>
          <div class="top5-info">
            <p class="top5-name">${esc(a.name)}</p>
            <p class="top5-secondary">${fmtNum(a.playcount)} scrobbles</p>
            ${rank ? `<p class="top5-tertiary">#${rank} this period</p>` : ''}
          </div>
        </li>`;
    }).join('');
  }

  function renderTracks(data) {
    const list    = cardTracks.querySelector('.top5-list');
    const totalEl = cardTracks.querySelector('.top5-total');
    const tracks  = data.toptracks.track || [];
    const total   = data.toptracks['@attr']?.total;
    if (total) totalEl.textContent = `${fmtNum(total)} Total`;
    list.innerHTML = tracks.map(t => {
      const img = getImg(t.image, 'medium');
      return `
        <li class="top5-item">
          <div class="top5-thumb"${img ? ` style="background-image:url('${esc(img)}');background-size:cover;background-position:center;"` : ''}></div>
          <div class="top5-info">
            <p class="top5-name">${esc(t.name)}</p>
            <p class="top5-secondary">${esc(t.artist.name)}</p>
            <p class="top5-tertiary">${fmtNum(t.playcount)} scrobbles</p>
          </div>
        </li>`;
    }).join('');
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async function loadData(periodKey) {
    metaRange.textContent = periodDateRange(periodKey);
    metaScrobbles.innerHTML = '<span class="ov-meta-skel"></span>';

    showSkeleton(cardAlbums.querySelector('.top5-list'));
    showSkeleton(cardArtists.querySelector('.top5-list'));
    showSkeleton(cardTracks.querySelector('.top5-list'));
    cardAlbums.querySelector('.top5-total').textContent  = '';
    cardArtists.querySelector('.top5-total').textContent = '';
    cardTracks.querySelector('.top5-total').textContent  = '';

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
  }

  loadData(currentPeriod);
})();
