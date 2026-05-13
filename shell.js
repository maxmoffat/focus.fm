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

  // ── Mobile nav ─────────────────────────────────────────────────────────────

  const HAMBURGER_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  const CLOSE_SVG     = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  const PAGE_NAMES = { overview: 'Overview', scrobbles: 'Scrobbles', 'grid-generator': 'Grid Generator', community: 'Community' };
  const PAGE_HREFS = { overview: 'overview.html', scrobbles: 'scrobbles.html', 'grid-generator': 'grid-generator.html', community: 'community.html' };

  // Hamburger button — prepended as first child of topbar
  const hamburger = document.createElement('button');
  hamburger.className = 'mob-hamburger';
  hamburger.setAttribute('aria-label', 'Open menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = HAMBURGER_SVG;
  document.querySelector('.topbar').prepend(hamburger);

  // Mobile topbar center: "focus.fm" + page name
  const mobCenter = document.createElement('div');
  mobCenter.className = 'mob-topbar-center';
  mobCenter.innerHTML = `<span class="mob-brand-text"><span class="mob-brand-red">focus</span>.fm</span><span class="mob-page-name">${PAGE_NAMES[page] || ''}</span>`;
  topbarUser.parentElement.insertBefore(mobCenter, topbarUser);

  // Build nav links from the same icons map used for the sidenav
  const navHTML = Object.keys(icons).map(key => {
    const isActive = key === page;
    return `<a class="mob-nav-item${isActive ? ' active' : ''}" href="${PAGE_HREFS[key]}" data-page="${key}">
      <img class="mob-nav-icon" src="${icons[key][isActive ? 'active' : 'default']}" alt="" />
      <span>${PAGE_NAMES[key]}</span>
    </a>`;
  }).join('');

  // Mobile menu overlay
  const mobMenu = document.createElement('div');
  mobMenu.className = 'mob-menu';
  mobMenu.setAttribute('aria-hidden', 'true');
  mobMenu.innerHTML = `
    <div class="mob-backdrop" id="mob-backdrop"></div>
    <div class="mob-panel">
      <div class="mob-panel-head">
        <div class="mob-head-logos">
          <span class="mob-brand-text"><span class="mob-brand-red">focus</span>.fm</span>
          <span class="mob-logo-sep"></span>
          <img src="assets/icon-logo-mark.svg" alt="" class="mob-lastfm-logo" />
        </div>
        <button class="mob-close" id="mob-close" aria-label="Close menu">${CLOSE_SVG}</button>
      </div>
      <nav class="mob-nav">${navHTML}</nav>
      <div class="mob-panel-foot">
        <div class="mob-foot-theme">
          <span class="mob-foot-label">Appearance</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(mobMenu);

  // Mobile theme toggle — separate button wired to the same theme state
  const mobThemeBtn = document.createElement('button');
  mobThemeBtn.className = 'theme-toggle';
  mobThemeBtn.setAttribute('aria-label', 'Toggle dark mode');

  function syncMobThemeIcon() {
    mobThemeBtn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? SUN_SVG : MOON_SVG;
  }
  syncMobThemeIcon();

  mobThemeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    syncThemeIcon();
    syncMobThemeIcon();
  });

  // Keep mobile icon in sync when desktop button is clicked
  themeBtn.addEventListener('click', syncMobThemeIcon);

  mobMenu.querySelector('.mob-foot-theme').appendChild(mobThemeBtn);

  // Open / close
  function openMobMenu() {
    mobMenu.classList.add('mob-menu--open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobMenu.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMobMenu() {
    mobMenu.classList.remove('mob-menu--open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openMobMenu);
  document.getElementById('mob-backdrop').addEventListener('click', closeMobMenu);
  document.getElementById('mob-close').addEventListener('click', closeMobMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobMenu(); });
}
