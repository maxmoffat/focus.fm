(function () {
  'use strict';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getImg(images, preferred) {
    if (!Array.isArray(images)) return '';
    const order = [preferred, 'extralarge', 'large', 'medium', 'small'].filter(Boolean);
    for (const size of order) {
      const found = images.find(i => i.size === size);
      if (found && found['#text']) return found['#text'];
    }
    return '';
  }

  function getRegisteredTs(user) {
    const reg = user.registered;
    if (!reg) return 0;
    if (typeof reg === 'string' || typeof reg === 'number') return parseInt(reg, 10);
    if (reg.unixtime) return parseInt(reg.unixtime, 10);
    return 0;
  }

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  function fmtJoinDate(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return `Joined ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function fmtMemberSince(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `Member since ${mm}/${dd}/${d.getFullYear()}`;
  }

  function firstItem(result, key, sub) {
    if (result.status !== 'fulfilled') return null;
    const val = result.value?.[key]?.[sub];
    if (!val) return null;
    return Array.isArray(val) ? val[0] : (typeof val === 'object' ? val : null);
  }

  const cmTitle    = document.getElementById('cm-title');
  const cmMeta     = document.getElementById('cm-meta');
  const cmCount    = document.getElementById('cm-count');
  const cmGrid     = document.getElementById('cm-grid');
  const cmSentinel = document.getElementById('cm-sentinel');

  const username = sessionStorage.getItem('lfm_username');

  let currentPage = 1;
  let totalPages  = 1;
  let loading     = false;
  let loadGen     = 0;

  function createSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'cm-card cm-card--skel';
    card.innerHTML = `
      <div class="cm-card-top">
        <div class="cm-avatar cm-skel"></div>
        <div class="cm-card-info" style="flex:1">
          <div class="cm-skel cm-skel--line" style="width:110px"></div>
          <div class="cm-skel cm-skel--line" style="width:85px"></div>
          <div class="cm-skel cm-skel--line" style="width:100px;height:10px"></div>
        </div>
      </div>
      <div class="cm-divider"></div>
      <div class="cm-stats">
        <div class="cm-stat">
          <div class="cm-skel cm-skel--line" style="width:55px;height:10px"></div>
          <div class="cm-skel cm-skel--line" style="width:80%"></div>
        </div>
        <div class="cm-stat">
          <div class="cm-skel cm-skel--line" style="width:55px;height:10px"></div>
          <div class="cm-skel cm-skel--line" style="width:60%"></div>
        </div>
        <div class="cm-stat">
          <div class="cm-skel cm-skel--line" style="width:55px;height:10px"></div>
          <div class="cm-skel cm-skel--line" style="width:70%"></div>
        </div>
      </div>`;
    return card;
  }

  function buildCardHtml(user, { artist, album, track }) {
    const img      = getImg(user.image, 'large');
    const regTs    = getRegisteredTs(user);
    const joinDate = fmtJoinDate(regTs);
    const realname = (user.realname && user.realname.trim()) ? user.realname : '—';

    const avatarStyle   = img ? ` style="background-image:url('${esc(img)}');background-size:cover;background-position:center;"` : '';
    const avatarInitial = img ? '' : esc(user.name.charAt(0).toUpperCase());

    const artistVal = artist?.name || '—';
    const albumVal  = album
      ? esc(album.name) + (album.artist?.name ? ' – ' + esc(album.artist.name) : '')
      : '—';
    const trackVal  = track
      ? esc(track.name) + (track.artist?.name ? ' – ' + esc(track.artist.name) : '')
      : '—';

    return `
      <div class="cm-card">
        <div class="cm-card-top">
          <div class="cm-avatar"${avatarStyle}>${avatarInitial}</div>
          <div class="cm-card-info">
            <a class="cm-username" href="https://www.last.fm/user/${esc(user.name)}" target="_blank" rel="noopener noreferrer">${esc(user.name)}</a>
            <p class="cm-realname">${esc(realname)}</p>
            <p class="cm-joined">${esc(joinDate)}</p>
          </div>
        </div>
        <div class="cm-divider"></div>
        <div class="cm-stats">
          <div class="cm-stat">
            <p class="cm-stat-label">Top Album</p>
            <p class="cm-stat-val">${albumVal}</p>
          </div>
          <div class="cm-stat">
            <p class="cm-stat-label">Top Artist</p>
            <p class="cm-stat-val">${esc(artistVal)}</p>
          </div>
          <div class="cm-stat">
            <p class="cm-stat-label">Top Track</p>
            <p class="cm-stat-val">${trackVal}</p>
          </div>
        </div>
      </div>`;
  }

  async function enrichCard(cardEl, user, gen) {
    const [artistR, albumR, trackR] = await Promise.allSettled([
      LastFM.getTopArtists(user.name, 'all', 1),
      LastFM.getTopAlbums(user.name, 'all', 1),
      LastFM.getTopTracks(user.name, 'all', 1),
    ]);

    if (gen !== loadGen || !cardEl.isConnected) return;

    const html = buildCardHtml(user, {
      artist: firstItem(artistR, 'topartists', 'artist'),
      album:  firstItem(albumR,  'topalbums',  'album'),
      track:  firstItem(trackR,  'toptracks',  'track'),
    });

    cardEl.outerHTML = html;
  }

  async function loadPage(page) {
    if (loading) return;
    loading = true;

    const gen = loadGen;

    try {
      const data     = await LastFM.getFriends(username, page, 25);
      const rawUsers = data.friends?.user;
      const attr     = data.friends?.['@attr'];

      if (gen !== loadGen) return;

      const users = Array.isArray(rawUsers) ? rawUsers : rawUsers ? [rawUsers] : [];
      const total = parseInt(attr?.total, 10) || 0;
      const pages = parseInt(attr?.totalPages, 10) || 1;

      if (page === 1) {
        totalPages = pages;
        if (cmCount) cmCount.textContent = `${total.toLocaleString()} Following`;
        if (cmGrid)  cmGrid.innerHTML = '';

        if (users.length === 0) {
          if (cmGrid) cmGrid.innerHTML = `<p class="cm-empty">Not following anyone yet.</p>`;
          return;
        }
      }

      const cardEls = users.map(() => {
        const card = createSkeletonCard();
        cmGrid.appendChild(card);
        return card;
      });

      users.forEach((user, i) => enrichCard(cardEls[i], user, gen));

    } catch (err) {
      if (gen !== loadGen) return;
      if (page === 1 && cmGrid) {
        cmGrid.innerHTML = `<p class="cm-error">Failed to load. Try refreshing.</p>`;
      }
      console.error('community loadPage failed:', err);
    } finally {
      if (gen === loadGen) loading = false;
    }
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    if (loading) return;
    if (currentPage >= totalPages) return;
    currentPage++;
    loadPage(currentPage);
  }, { rootMargin: '200px', threshold: 0 });

  if (cmSentinel) observer.observe(cmSentinel);

  if (username) {
    if (cmTitle) cmTitle.textContent = `${username}'s Community`;

    LastFM.getUserInfo(username).then(data => {
      const ts = parseInt(data.user?.registered?.unixtime, 10) || 0;
      if (cmMeta) cmMeta.textContent = fmtMemberSince(ts);

      const img      = getImg(data.user?.image || [], 'medium');
      const avatarEl = document.getElementById('user-avatar');
      if (img && avatarEl) {
        avatarEl.style.backgroundImage    = `url('${img}')`;
        avatarEl.style.backgroundSize     = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
      }
    }).catch(() => {});

    loadPage(1);
  }
})();
