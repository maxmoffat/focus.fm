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
}
