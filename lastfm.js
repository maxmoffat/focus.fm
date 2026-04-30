const LastFM = (() => {
  const API_KEY = 'b82e2ea83e3db65695e4531211d6f707';
  const BASE    = 'https://ws.audioscrobbler.com/2.0/';

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
