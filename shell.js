// Apply saved theme immediately to avoid flash
const _savedTheme = localStorage.getItem('theme');
if (_savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

const username = sessionStorage.getItem('lfm_username');
if (!username) {
  window.location.replace('index.html');
} else {
  document.getElementById('topbar-username').textContent = username;
  document.getElementById('user-avatar').textContent = username.charAt(0);

  // Mark the correct sidenav item active and swap to its red icon
  const page = window.location.pathname.split('/').pop().replace('.html', '');
  const icons = {
    'overview':       { default: 'assets/icon-overview.svg',       active: 'assets/icon-overview-active.svg' },
    'scrobbles':      { default: 'assets/icon-scrobbles.svg',      active: 'assets/icon-scrobbles-active.svg' },
    'grid-generator': { default: 'assets/icon-grid.svg',           active: 'assets/icon-grid-generator-active.svg' },
    'community':      { default: 'assets/icon-community.svg',      active: 'assets/icon-community-active.svg' },
  };
  document.querySelectorAll('.sidenav-item').forEach((item) => {
    const isActive = item.dataset.page === page;
    item.classList.toggle('active', isActive);
    item.querySelector('.sidenav-icon').src = icons[item.dataset.page][isActive ? 'active' : 'default'];
  });

  // Back to top button
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.innerHTML = '<img src="assets/icon-back-to-top.svg" alt="" />';
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('visible', window.scrollY > 200);
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Dark mode toggle
  const MOON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a.5.5 0 0 0-.6-.6A6 6 0 1 0 14.1 9.6a.5.5 0 0 0-.6-.1z"/></svg>`;
  const SUN_SVG  = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.5" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/></svg>`;

  const themeBtn = document.createElement('button');
  themeBtn.className = 'theme-toggle';
  themeBtn.setAttribute('aria-label', 'Toggle dark mode');

  function syncThemeIcon() {
    themeBtn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? SUN_SVG : MOON_SVG;
  }
  syncThemeIcon();

  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    syncThemeIcon();
  });

  const topbarUser = document.querySelector('.topbar-user');
  topbarUser.insertBefore(themeBtn, topbarUser.firstChild);
}
