const LastFM = (() => {
  const API_KEY    = 'a96b0621eb02c70f7a711a11e5d5948d';
  const API_SECRET = 'f2860ef466e37efa24ff49c5fbd05546';
  const BASE       = 'https://ws.audioscrobbler.com/2.0/';
  const SESSION_KEY = 'lfm_session';

  // ── MD5 (RFC 1321) ───────────────────────────────────────────────────────
  function md5(str) {
    function add(x, y) { return (x + y) | 0; }
    function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
    function cmn(q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b); }
    function ff(a,b,c,d,x,s,t) { return cmn((b&c)|(~b&d),a,b,x,s,t); }
    function gg(a,b,c,d,x,s,t) { return cmn((b&d)|(c&~d),a,b,x,s,t); }
    function hh(a,b,c,d,x,s,t) { return cmn(b^c^d,a,b,x,s,t); }
    function ii(a,b,c,d,x,s,t) { return cmn(c^(b|~d),a,b,x,s,t); }

    const s   = unescape(encodeURIComponent(str));
    const len = s.length;
    const nblk = ((len + 8) >> 6) + 1;
    const w   = new Int32Array(nblk * 16);
    for (let i = 0; i < len; i++) w[i >> 2] |= s.charCodeAt(i) << ((i & 3) * 8);
    w[len >> 2] |= 0x80 << ((len & 3) * 8);
    w[nblk * 16 - 2] = len * 8;

    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < w.length; i += 16) {
      const [oa,ob,oc,od] = [a,b,c,d];
      a=ff(a,b,c,d,w[i+ 0], 7, -680876936); d=ff(d,a,b,c,w[i+ 1],12, -389564586);
      c=ff(c,d,a,b,w[i+ 2],17,  606105819); b=ff(b,c,d,a,w[i+ 3],22,-1044525330);
      a=ff(a,b,c,d,w[i+ 4], 7, -176418897); d=ff(d,a,b,c,w[i+ 5],12, 1200080426);
      c=ff(c,d,a,b,w[i+ 6],17,-1473231341); b=ff(b,c,d,a,w[i+ 7],22,  -45705983);
      a=ff(a,b,c,d,w[i+ 8], 7, 1770035416); d=ff(d,a,b,c,w[i+ 9],12,-1958414417);
      c=ff(c,d,a,b,w[i+10],17,    -42063);  b=ff(b,c,d,a,w[i+11],22,-1990404162);
      a=ff(a,b,c,d,w[i+12], 7, 1804603682); d=ff(d,a,b,c,w[i+13],12,  -40341101);
      c=ff(c,d,a,b,w[i+14],17,-1502002290); b=ff(b,c,d,a,w[i+15],22, 1236535329);
      a=gg(a,b,c,d,w[i+ 1], 5, -165796510); d=gg(d,a,b,c,w[i+ 6], 9,-1069501632);
      c=gg(c,d,a,b,w[i+11],14,  643717713); b=gg(b,c,d,a,w[i+ 0],20, -373897302);
      a=gg(a,b,c,d,w[i+ 5], 5, -701558691); d=gg(d,a,b,c,w[i+10], 9,   38016083);
      c=gg(c,d,a,b,w[i+15],14, -660478335); b=gg(b,c,d,a,w[i+ 4],20, -405537848);
      a=gg(a,b,c,d,w[i+ 9], 5,  568446438); d=gg(d,a,b,c,w[i+14], 9,-1019803690);
      c=gg(c,d,a,b,w[i+ 3],14, -187363961); b=gg(b,c,d,a,w[i+ 8],20, 1163531501);
      a=gg(a,b,c,d,w[i+13], 5,-1444681467); d=gg(d,a,b,c,w[i+ 2], 9,  -51403784);
      c=gg(c,d,a,b,w[i+ 7],14, 1735328473); b=gg(b,c,d,a,w[i+12],20,-1926607734);
      a=hh(a,b,c,d,w[i+ 5], 4,    -378558); d=hh(d,a,b,c,w[i+ 8],11,-2022574463);
      c=hh(c,d,a,b,w[i+11],16, 1839030562); b=hh(b,c,d,a,w[i+14],23,  -35309556);
      a=hh(a,b,c,d,w[i+ 1], 4,-1530992060); d=hh(d,a,b,c,w[i+ 4],11, 1272893353);
      c=hh(c,d,a,b,w[i+ 7],16, -155497632); b=hh(b,c,d,a,w[i+10],23,-1094730640);
      a=hh(a,b,c,d,w[i+13], 4,  681279174); d=hh(d,a,b,c,w[i+ 0],11, -358537222);
      c=hh(c,d,a,b,w[i+ 3],16, -722521979); b=hh(b,c,d,a,w[i+ 6],23,   76029189);
      a=hh(a,b,c,d,w[i+ 9], 4, -640364487); d=hh(d,a,b,c,w[i+12],11, -421815835);
      c=hh(c,d,a,b,w[i+15],16,  530742520); b=hh(b,c,d,a,w[i+ 2],23, -995338651);
      a=ii(a,b,c,d,w[i+ 0], 6, -198630844); d=ii(d,a,b,c,w[i+ 7],10, 1126891415);
      c=ii(c,d,a,b,w[i+14],15,-1416354905); b=ii(b,c,d,a,w[i+ 5],21,  -57434055);
      a=ii(a,b,c,d,w[i+12], 6, 1700485571); d=ii(d,a,b,c,w[i+ 3],10,-1894986606);
      c=ii(c,d,a,b,w[i+10],15,   -1051523); b=ii(b,c,d,a,w[i+ 1],21,-2054922799);
      a=ii(a,b,c,d,w[i+ 8], 6, 1873313359); d=ii(d,a,b,c,w[i+15],10,  -30611744);
      c=ii(c,d,a,b,w[i+ 6],15,-1560198380); b=ii(b,c,d,a,w[i+13],21, 1309151649);
      a=ii(a,b,c,d,w[i+ 4], 6, -145523070); d=ii(d,a,b,c,w[i+11],10,-1120210379);
      c=ii(c,d,a,b,w[i+ 2],15,  718787259); b=ii(b,c,d,a,w[i+ 9],21, -343485551);
      a=add(a,oa); b=add(b,ob); c=add(c,oc); d=add(d,od);
    }
    return [a,b,c,d].map(n =>
      Array.from({length:4}, (_,j) => ('0'+((n>>(j*8))&0xff).toString(16)).slice(-2)).join('')
    ).join('');
  }

  function sign(params) {
    const str = Object.keys(params).sort().map(k => k + params[k]).join('') + API_SECRET;
    return md5(str);
  }

  function getStoredSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  }

  async function request(method, params) {
    const url = new URL(BASE);
    url.searchParams.set('method',  method);
    url.searchParams.set('api_key', API_KEY);
    url.searchParams.set('format',  'json');
    for (const [k, v] of Object.entries(params || {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    const res  = await fetch(url.toString());
    const data = await res.json();
    if (data.error) throw new Error(data.message || `Last.fm error ${data.error}`);
    return data;
  }

  const PERIOD = {
    week:  '7day',
    month: '1month',
    '3m':  '3month',
    '6m':  '6month',
    '12m': '12month',
    all:   'overall',
  };

  const PERIOD_DAYS = { week: 7, month: 30, '3m': 90, '6m': 180, '12m': 365 };

  function periodToTimestamps(periodKey) {
    if (periodKey === 'all') return {};
    const days = PERIOD_DAYS[periodKey] || 30;
    const to   = Math.floor(Date.now() / 1000);
    const from = to - days * 86400;
    return { from, to };
  }

  // ── Time-series bucket helpers ────────────────────────────────────────────

  const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function makeBuckets(fromTs, toTs, type) {
    const buckets = [];

    if (type === 'day') {
      let t = fromTs;
      while (t < toTs) {
        const end = Math.min(t + 86400, toTs);
        const d = new Date(t * 1000);
        buckets.push({ from: t, to: end - 1,
          label: `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}` });
        t = end;
      }

    } else if (type === 'week') {
      let t = fromTs;
      while (t < toTs) {
        const end = Math.min(t + 7 * 86400, toTs);
        const d = new Date(t * 1000);
        buckets.push({ from: t, to: end - 1,
          label: `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}` });
        t = end;
      }

    } else if (type === 'month') {
      const s = new Date(fromTs * 1000);
      let yr = s.getFullYear(), mo = s.getMonth();
      while (true) {
        const bStart = Math.max(Math.floor(new Date(yr, mo, 1).getTime() / 1000), fromTs);
        if (bStart >= toTs) break;
        const bEnd = Math.min(Math.floor(new Date(yr, mo + 1, 1).getTime() / 1000) - 1, toTs);
        buckets.push({ from: bStart, to: bEnd, label: `${MO[mo]} '${String(yr).slice(-2)}` });
        if (++mo > 11) { mo = 0; yr++; }
      }

    } else if (type === 'quarter') {
      const s = new Date(fromTs * 1000);
      let yr = s.getFullYear(), mo = Math.floor(s.getMonth() / 3) * 3;
      while (true) {
        const bStart = Math.max(Math.floor(new Date(yr, mo, 1).getTime() / 1000), fromTs);
        if (bStart >= toTs) break;
        const bEnd = Math.min(Math.floor(new Date(yr, mo + 3, 1).getTime() / 1000) - 1, toTs);
        buckets.push({ from: bStart, to: bEnd, label: `${MO[mo]} '${String(yr).slice(-2)}` });
        mo += 3;
        if (mo > 11) { mo = 0; yr++; }
      }

    } else if (type === 'year') {
      const s = new Date(fromTs * 1000);
      let yr = s.getFullYear();
      while (true) {
        const bStart = Math.max(Math.floor(new Date(yr, 0, 1).getTime() / 1000), fromTs);
        if (bStart >= toTs) break;
        const bEnd = Math.min(Math.floor(new Date(yr + 1, 0, 1).getTime() / 1000) - 1, toTs);
        buckets.push({ from: bStart, to: bEnd, label: String(yr) });
        yr++;
      }
    }

    return buckets;
  }

  return {
    API_KEY,

    async getSession(token) {
      const params = { api_key: API_KEY, method: 'auth.getSession', token };
      const api_sig = sign(params);
      const url = `${BASE}?method=auth.getSession&api_key=${API_KEY}&token=${token}&api_sig=${api_sig}&format=json`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.error) throw new Error(data.message || `Last.fm error ${data.error}`);
      return data.session;
    },

    getStoredSession,

    storeSession(session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    },

    clearSession() {
      localStorage.removeItem(SESSION_KEY);
    },

    PERIOD,

    async getTopGenres(user, artistLimit = 10) {
      const artistData = await request('user.getTopArtists', { user, period: 'overall', limit: artistLimit });
      const raw        = artistData.topartists?.artist || [];
      const artists    = Array.isArray(raw) ? raw : [raw];

      const tagResults = await Promise.allSettled(
        artists.map(a => request('artist.getTopTags', { artist: a.name }))
      );

      const scores = {};
      tagResults.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        const tags   = r.value.toptags?.tag;
        const tagArr = Array.isArray(tags) ? tags : tags ? [tags] : [];
        const weight = artists.length - i;
        tagArr.slice(0, 5).forEach(t => {
          const key      = t.name.toLowerCase();
          scores[key] = (scores[key] || 0) + (parseInt(t.count, 10) || 0) * weight;
        });
      });

      return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => ({ name }));
    },

    getTagTopArtists(tag, limit = 10) {
      return request('tag.getTopArtists', { tag, limit });
    },

    async getArtistInfo(artist) {
      const data    = await request('artist.getInfo', { artist, autocorrect: 1 });
      const summary = data.artist?.bio?.summary || '';
      return summary.replace(/<[^>]*>/g, '').trim();
    },

    getTopAlbums(user, periodKey, limit = 10) {
      return request('user.getTopAlbums', { user, period: PERIOD[periodKey] || periodKey, limit });
    },

    getTopArtists(user, periodKey, limit = 10) {
      return request('user.getTopArtists', { user, period: PERIOD[periodKey] || periodKey, limit });
    },

    getTopTracks(user, periodKey, limit = 10) {
      return request('user.getTopTracks', { user, period: PERIOD[periodKey] || periodKey, limit });
    },

    async getNowPlaying(user) {
      const data  = await request('user.getRecentTracks', { user, limit: 1 });
      const raw   = data.recenttracks?.track;
      const track = Array.isArray(raw) ? raw[0] : raw;
      if (!track || track['@attr']?.nowplaying !== 'true') return null;
      return {
        name:   track.name || '',
        artist: track.artist?.['#text'] || track.artist?.name || '',
      };
    },

    getRecentTracks(user, periodKey, page = 1, limit = 50) {
      const ts = periodToTimestamps(periodKey);
      return request('user.getRecentTracks', { user, limit, page, ...ts });
    },

    getUserInfo(user) {
      return request('user.getInfo', { user });
    },

    async getScrobbleCount(user, periodKey) {
      if (periodKey === 'all') {
        const data = await request('user.getInfo', { user });
        return parseInt(data.user.playcount, 10) || 0;
      }
      const ts   = periodToTimestamps(periodKey);
      const data = await request('user.getRecentTracks', { user, limit: 1, ...ts });
      return parseInt(data.recenttracks['@attr'].total, 10) || 0;
    },

    async getScrobbleTimeSeries(user, periodKey) {
      const now = Math.floor(Date.now() / 1000);
      let buckets;

      if (periodKey === 'all') {
        const info   = await request('user.getInfo', { user });
        const regTs  = parseInt(info.user.registered.unixtime, 10);
        const months = Math.round((now - regTs) / (30.44 * 86400));
        const type   = months <= 36 ? 'month' : months <= 120 ? 'quarter' : 'year';
        buckets = makeBuckets(regTs, now, type);
      } else {
        const DAYS = { week: 7, month: 30, '3m': 91, '6m': 182, '12m': 365 };
        const from  = now - DAYS[periodKey] * 86400;
        const type  = (periodKey === 'week' || periodKey === 'month') ? 'day'
                    : periodKey === '12m' ? 'month' : 'week';
        buckets = makeBuckets(from, now, type);
      }

      return Promise.all(
        buckets.map(b =>
          request('user.getRecentTracks', { user, from: b.from, to: b.to, limit: 1 })
            .then(d => ({ label: b.label, count: parseInt(d.recenttracks['@attr']?.total, 10) || 0 }))
            .catch(() => ({ label: b.label, count: 0 }))
        )
      );
    },

    getFollowers(user, page = 1, limit = 25) {
      return request('user.getFollowers', { user, page, limit });
    },

    getFriends(user, page = 1, limit = 25) {
      return request('user.getFriends', { user, page, limit });
    },

    async getPrevPeriodScrobbleCount(user, periodKey) {
      if (periodKey === 'all') return null;
      const days = PERIOD_DAYS[periodKey] || 30;
      const to   = Math.floor(Date.now() / 1000) - days * 86400;
      const from = to - days * 86400;
      const data = await request('user.getRecentTracks', { user, from, to, limit: 1 });
      return parseInt(data.recenttracks['@attr'].total, 10) || 0;
    },

    async getPrevPeriodUniqueCounts(user, periodKey) {
      if (periodKey === 'all') return null;
      const days = PERIOD_DAYS[periodKey] || 30;
      const to   = Math.floor(Date.now() / 1000) - days * 86400;
      const from = to - days * 86400;

      const [albumsR, artistsR, tracksR] = await Promise.allSettled([
        request('user.getWeeklyAlbumChart',  { user, from, to }),
        request('user.getWeeklyArtistChart', { user, from, to }),
        request('user.getWeeklyTrackChart',  { user, from, to }),
      ]);

      const count = (r, key, sub) => {
        if (r.status !== 'fulfilled') return null;
        const raw = r.value?.[key]?.[sub];
        return Array.isArray(raw) ? raw.length : raw ? 1 : 0;
      };

      return {
        albums:  count(albumsR,  'weeklyalbumchart',  'album'),
        artists: count(artistsR, 'weeklyartistchart', 'artist'),
        tracks:  count(tracksR,  'weeklytrackchart',  'track'),
      };
    },

    periodToTimestamps,

    async getAudioDBImage(name) {
      const res  = await fetch(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(name)}`);
      const data = await res.json();
      return data.artists?.[0]?.strArtistThumb || '';
    },

    async getiTunesImage(term, entity = 'song') {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=${entity}&limit=1`;
      const res  = await fetch(url);
      const data = await res.json();
      const art  = data.results?.[0]?.artworkUrl100;
      return art ? art.replace('100x100bb', '600x600bb') : '';
    },
  };
})();
