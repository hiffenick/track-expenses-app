/* ============================================================
   login.js — Expenso · Log In Page
   ============================================================ */

(function () {
  'use strict';

  /* ── Password show/hide ──────────────────────────────────── */
  const pwInput  = document.getElementById('pwInput');
  const pwToggle = document.getElementById('pwToggle');
  const eyeOpen  = pwToggle?.querySelector('.li-eye-open');
  const eyeClosed= pwToggle?.querySelector('.li-eye-closed');

  pwToggle?.addEventListener('click', () => {
    const isHidden = pwInput.type === 'password';
    pwInput.type = isHidden ? 'text' : 'password';
    eyeOpen.style.display  = isHidden ? 'none' : '';
    eyeClosed.style.display= isHidden ? ''     : 'none';
  });

  /* ── Field helpers ───────────────────────────────────────── */
  function getField(id) { return document.getElementById('field-' + id); }
  function getInput(id) { return getField(id)?.querySelector('.li-input'); }
  function getErr(id)   { return document.getElementById('err-' + id); }

  function setValid(id) {
    const f = getField(id);
    if (!f) return;
    f.classList.add('is-valid');
    f.classList.remove('has-error');
    const err = getErr(id);
    if (err) { err.textContent = ''; err.style.display = 'none'; }
  }

  function setError(id, msg) {
    const f = getField(id);
    if (!f) return;
    f.classList.add('has-error');
    f.classList.remove('is-valid');
    const err = getErr(id);
    if (err) { err.textContent = msg; err.style.display = 'block'; }
  }

  function clearState(id) {
    const f = getField(id);
    if (!f) return;
    f.classList.remove('has-error', 'is-valid');
    const err = getErr(id);
    if (err) { err.textContent = ''; err.style.display = 'none'; }
  }

  /* ── Live validation ─────────────────────────────────────── */

  /* Email */
  const emailInput = getInput('email');
  emailInput?.addEventListener('input', () => {
    const v = emailInput.value.trim();
    if (!v) { clearState('email'); return; }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    ok ? setValid('email') : setError('email', 'Enter a valid email address.');
  });

  /* Password — just check presence/length on login */
  pwInput?.addEventListener('input', () => {
    const v = pwInput.value;
    if (!v) { clearState('password'); return; }
    if (v.length < 1) { setError('password', 'Password is required.'); return; }
    setValid('password');
  });

  /* ── Submit guard ────────────────────────────────────────── */
  const form      = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');

  form?.addEventListener('submit', (e) => {
    let ok = true;

    const email = emailInput?.value.trim() || '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', 'Enter a valid email address.');
      ok = false;
    }

    const pw = pwInput?.value || '';
    if (!pw) {
      setError('password', 'Password is required.');
      ok = false;
    }

    if (!ok) {
      e.preventDefault();
      const firstErr = form.querySelector('.has-error');
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    /* loading state */
    if (submitBtn) {
      submitBtn.disabled = true;
      const txt = submitBtn.querySelector('.li-submit-text');
      if (txt) txt.textContent = 'Logging in…';
    }
  });

})();