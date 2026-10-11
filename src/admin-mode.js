/* Local interface lock; server authorization must be implemented separately. */
(() => {
  const toggle = document.getElementById('adminModeToggle');
  const state = document.getElementById('adminModeState');
  const storageKey = 'hd-admin-mode';
  const dialog = document.getElementById('adminPasswordDialog');
  const password = document.getElementById('adminPassword');
  const error = document.getElementById('adminPasswordError');
  let enabled = false;
  function setMode(value) {
    enabled = value;
    document.body.classList.toggle('admin-mode', enabled);
    toggle.setAttribute('aria-checked', String(enabled));
    toggle.title = 'Admin Mode: ' + (enabled ? 'On' : 'Off');
    state.textContent = enabled ? 'On' : 'Off';
    try { localStorage.setItem(storageKey, String(enabled)); } catch {}
    window.dispatchEvent(new Event('hd-admin-mode-change'));
  }
  function clearPassword() {
    password.value = '';
    password.removeAttribute('aria-invalid');
    error.textContent = '';
    error.hidden = true;
  }
  // A saved preference must not bypass the password on reload.
  setMode(false);
  toggle.addEventListener('click', () => {
    if (enabled) { setMode(false); return; }
    clearPassword();
    dialog.showModal();
    password.focus();
  });
  document.getElementById('adminPasswordForm').addEventListener('submit', event => {
    event.preventDefault();
    if (password.value !== 'revilla123') {
      password.value = '';
      password.setAttribute('aria-invalid', 'true');
      error.textContent = 'Incorrect password. Please try again.';
      error.hidden = false;
      password.focus();
      return;
    }
    setMode(true);
    dialog.close();
  });
  password.addEventListener('input', () => { password.removeAttribute('aria-invalid'); error.hidden = true; });
  document.getElementById('adminPasswordCancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { clearPassword(); toggle.focus(); });
})();
