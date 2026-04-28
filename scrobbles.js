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

  function timeAgo(uts) {
    const diff = Math.floor(Date.now() / 1000) - Number(uts);
    if (diff < 60)      return 'Just now';
    if (diff < 3600)    return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400)   return `${Math.floor(diff / 3600)} hr ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
    const d = new Date(Number(uts) * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const titleEl  = document.getElementById('sc-title');
  const metaEl   = document.getElementById('sc-meta');
  const picker   = document.getElementById('sc-date-picker');
  const btn      = document.getElementById('sc-date-btn');
  const label    = document.getElementById('sc-date-label');
  const menu     = document.getElementById('sc-date-menu');
  const tbody    = document.getElementById('sc-tbody');
  const loader   = document.getElementById('sc-loader');
  const endMsg   = document.getElementById('sc-end');
  const sentinel = document.getElementById('sc-sentinel');

  const DATE_LABELS = {
    week: 'Week', month: 'Month', '3m': '3 Months',
    '6m': '6 Months', '12m': '12 Months', all: 'All Time',
  };

  const username = sessionStorage.getItem('lfm_username');

  // ── User avatar ───────────────────────────────────────────────────────────

  if (username) {
    LastFM.getUserInfo(username).then(data => {
      const img     = data.user?.image;
      const avatarEl = document.getElementById('user-avatar');
      if (avatarEl && Array.isArray(img)) {
        const found = img.find(i => i.size === 'medium' && i['#text']);
        if (found) {
          avatarEl.style.backgroundImage    = `url('${found['#text']}')`;
          avatarEl.style.backgroundSize     = 'cover';
          avatarEl.style.backgroundPosition = 'center';
          avatarEl.textContent = '';
        }
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
      resetAndLoad();
    }
  });

  // ── Three-dot context menu ────────────────────────────────────────────────

  let activeMenu = null;

  document.addEventListener('click', e => {
    // Close date picker unless clicking inside it
    if (!picker.contains(e.target)) picker.classList.remove('open');

    const menuBtn = e.target.closest('.sc-menu-btn');
    if (menuBtn) {
      const wrap = menuBtn.closest('.sc-menu-wrap');
      const list = wrap.querySelector('.sc-menu-list');
      if (activeMenu && activeMenu !== list) {
        activeMenu.hidden = true;
        activeMenu.closest('.sc-menu-wrap').classList.remove('open');
      }
      const isOpen = !list.hidden;
      list.hidden = isOpen;
      wrap.classList.toggle('open', !isOpen);
      activeMenu = isOpen ? null : list;
      return;
    }

    // Close active menu when clicking outside the menu list
    if (activeMenu && !e.target.closest('.sc-menu-list')) {
      activeMenu.hidden = true;
      activeMenu.closest('.sc-menu-wrap').classList.remove('open');
      activeMenu = null;
    }
  });

  // ── Pagination state ──────────────────────────────────────────────────────

  let currentPage = 0;
  let totalPages  = 1;
  let isLoading   = false;
  let countSet    = false;

  // ── Render ────────────────────────────────────────────────────────────────

  function renderRows(tracks) {
    tracks.forEach(t => {
      const nowPlaying = t['@attr']?.nowplaying === 'true';
      const img        = getImg(t.image, 'small');
      const artist     = t.artist?.['#text'] || '';
      const album      = t.album?.['#text']  || '';
      const time       = nowPlaying ? 'Now Playing' : timeAgo(t.date?.uts);

      const artistEnc = encodeURIComponent(artist);
      const trackEnc  = encodeURIComponent(t.name);
      const albumEnc  = encodeURIComponent(album);

      const row = document.createElement('div');
      row.className = 'sc-row' + (nowPlaying ? ' sc-row--now-playing' : '');
      row.innerHTML = `
        <div class="sc-thumb"${img ? ` style="background-image:url('${esc(img)}');background-size:cover;background-position:center;"` : ''}></div>
        <p class="sc-track-name">${esc(t.name)}</p>
        <p class="sc-artist-name">${esc(artist)}</p>
        <p class="sc-time${nowPlaying ? ' sc-time--now-playing' : ''}">${esc(time)}</p>
        <div class="sc-menu-wrap">
          <button class="sc-menu-btn" type="button" aria-label="More options">&#8942;</button>
          <ul class="sc-menu-list" hidden>
            <li><a href="https://www.last.fm/music/${artistEnc}/_/${trackEnc}" target="_blank" rel="noopener">View on Last.fm</a></li>
            <li><a href="https://www.last.fm/music/${artistEnc}" target="_blank" rel="noopener">View Artist</a></li>
            ${album ? `<li><a href="https://www.last.fm/music/${artistEnc}/${albumEnc}" target="_blank" rel="noopener">View Album</a></li>` : ''}
          </ul>
        </div>`;
      tbody.appendChild(row);
    });
  }

  // ── Load next page ────────────────────────────────────────────────────────

  async function loadNextPage() {
    if (isLoading || currentPage >= totalPages) return;
    isLoading = true;
    loader.hidden = false;

    try {
      const data   = await LastFM.getRecentTracks(username, currentPeriod, currentPage + 1);
      const attr   = data.recenttracks['@attr'];
      const raw    = data.recenttracks.track;
      const tracks = Array.isArray(raw) ? raw : raw ? [raw] : [];

      currentPage = parseInt(attr.page, 10);
      totalPages  = Math.max(1, parseInt(attr.totalPages, 10));

      if (!countSet) {
        const total = parseInt(attr.total, 10) || 0;
        titleEl.textContent = `${fmtNum(total)} scrobbles`;
        metaEl.textContent  = periodDateRange(currentPeriod);
        countSet = true;
      }

      renderRows(tracks);

      if (currentPage >= totalPages) {
        endMsg.hidden = false;
        observer.disconnect();
      }
    } catch (err) {
      if (!countSet) {
        titleEl.textContent = '— scrobbles';
        metaEl.textContent  = periodDateRange(currentPeriod);
        countSet = true;
      }
    } finally {
      isLoading = false;
      loader.hidden = true;
    }
  }

  // ── Reset on period change ────────────────────────────────────────────────

  function resetAndLoad() {
    currentPage = 0;
    totalPages  = 1;
    isLoading   = false;
    countSet    = false;
    tbody.innerHTML = '';
    endMsg.hidden   = true;
    titleEl.innerHTML = '<span class="sc-skel sc-skel--title"></span>';
    metaEl.textContent = periodDateRange(currentPeriod);
    observer.observe(sentinel);
    loadNextPage();
  }

  // ── IntersectionObserver ──────────────────────────────────────────────────

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadNextPage();
  }, { rootMargin: '400px' });

  // ── Init ──────────────────────────────────────────────────────────────────

  metaEl.textContent = periodDateRange(currentPeriod);
  observer.observe(sentinel);
  loadNextPage();
})();
