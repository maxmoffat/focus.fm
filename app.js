const loginBtn    = document.getElementById('login-btn');
const loginStatus = document.getElementById('login-status');

// Already authenticated — go straight to the app
const existing = LastFM.getStoredSession();
if (existing?.name) {
  window.location.replace('overview.html');
}

// Returning from Last.fm auth callback
const token = new URLSearchParams(window.location.search).get('token');
if (token) {
  loginBtn.disabled = true;
  loginStatus.hidden = false;
  loginStatus.textContent = 'Connecting to Last.fm…';

  LastFM.getSession(token)
    .then(session => {
      LastFM.storeSession(session);
      window.location.replace('overview.html');
    })
    .catch(() => {
      loginStatus.textContent = 'Something went wrong. Please try again.';
      loginBtn.disabled = false;
    });
}

loginBtn.addEventListener('click', () => {
  const cb = window.location.href.split('?')[0];
  window.location.href =
    `https://www.last.fm/api/auth/?api_key=${LastFM.API_KEY}&cb=${encodeURIComponent(cb)}`;
});
