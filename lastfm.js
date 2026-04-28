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

  return {
    PERIOD,

    getTopAlbums(user, periodKey, limit = 5) {
      return request('user.getTopAlbums', { user, period: PERIOD[periodKey] || periodKey, limit });
    },

    getTopArtists(user, periodKey, limit = 5) {
      return request('user.getTopArtists', { user, period: PERIOD[periodKey] || periodKey, limit });
    },

    getTopTracks(user, periodKey, limit = 5) {
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

    periodToTimestamps,
  };
})();
