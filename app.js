const usernameInput = document.getElementById('username-input');
const continueBtn   = document.getElementById('continue-btn');
const loginForm     = document.getElementById('login-form');

usernameInput.addEventListener('input', () => {
  continueBtn.disabled = usernameInput.value.trim() === '';
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;
  sessionStorage.setItem('lfm_username', username);
  window.location.href = 'overview.html';
});
