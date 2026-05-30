/* ============================================================
   signup.js — Expenso · Sign Up Page
   ============================================================ */

(function () {
  'use strict';

  /* ── Password show/hide ──────────────────────────────────── */
  const pwInput  = document.getElementById('pwInput');
  const pwToggle = document.getElementById('pwToggle');
  const eyeOpen  = pwToggle?.querySelector('.su-eye-open');
  const eyeClosed= pwToggle?.querySelector('.su-eye-closed');

  pwToggle?.addEventListener('click', () => {
    const isHidden = pwInput.type === 'password';
    pwInput.type = isHidden ? 'text' : 'password';
    eyeOpen.style.display  = isHidden ? 'none'  : '';
    eyeClosed.style.display= isHidden ? ''      : 'none';
  });

  /* ── Password strength meter ─────────────────────────────── */
  const pwFill     = document.getElementById('pwFill');
  const pwLabel    = document.getElementById('pwLabel');
  const pwStrength = document.getElementById('pwStrength');

  function scorePassword(pw) {
    let score = 0;
    if (!pw) return 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  const strengthLevels = [
    { pct: '0%',   color: 'transparent',          label: '' },
    { pct: '20%',  color: '#f87171',               label: 'Weak' },
    { pct: '40%',  color: '#fb923c',               label: 'Fair' },
    { pct: '60%',  color: '#facc15',               label: 'Good' },
    { pct: '80%',  color: '#4ade80',               label: 'Strong' },
    { pct: '100%', color: '#2dd4bf',               label: 'Excellent' },
  ];

  pwInput?.addEventListener('input', () => {
    const score = scorePassword(pwInput.value);
    const level = strengthLevels[score] || strengthLevels[0];

    if (pwInput.value.length > 0) {
      pwStrength?.classList.add('visible');
    } else {
      pwStrength?.classList.remove('visible');
    }

    if (pwFill) {
      pwFill.style.width      = level.pct;
      pwFill.style.background = level.color;
    }
    if (pwLabel) {
      pwLabel.textContent  = level.label;
      pwLabel.style.color  = level.color;
    }
  });

  /* ── Live field validation ───────────────────────────────── */
  function getField(id)  { return document.getElementById('field-' + id); }
  function getInput(id)  { return getField(id)?.querySelector('.su-input'); }
  function getErr(id)    { return document.getElementById('err-' + id); }

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

  /* Email */
  const emailInput = getInput('email');
  emailInput?.addEventListener('input', () => {
    const v = emailInput.value.trim();
    if (!v) { clearState('email'); return; }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    ok ? setValid('email') : setError('email', 'Enter a valid email address.');
  });

  /* Username */
  const usernameInput = getInput('username');
  usernameInput?.addEventListener('input', () => {
    const v = usernameInput.value.trim();
    if (!v) { clearState('username'); return; }
    if (v.length < 3)      { setError('username', 'At least 3 characters.'); return; }
    if (/\s/.test(v))       { setError('username', 'No spaces allowed.'); return; }
    setValid('username');
  });

  /* Phone */
  const phoneInput = getInput('phone');
  phoneInput?.addEventListener('input', () => {
    const v = phoneInput.value.replace(/\D/g, '');
    if (!phoneInput.value) { clearState('phone'); return; }
    if (v.length < 10) { setError('phone', 'Enter a valid 10-digit number.'); return; }
    setValid('phone');
  });

  /* Password */
  pwInput?.addEventListener('input', () => {
    const v = pwInput.value;
    if (!v) { clearState('password'); return; }
    if (v.length < 8) { setError('password', 'At least 8 characters required.'); return; }
    setValid('password');
  });

  /* ── Submit guard ─────────────────────────────────────────── */
  const form      = document.getElementById('signupForm');
  const submitBtn = document.getElementById('submitBtn');

  form?.addEventListener('submit', (e) => {
    let ok = true;

    const email = emailInput?.value.trim() || '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('email', 'Enter a valid email address.'); ok = false;
    }

    const username = usernameInput?.value.trim() || '';
    if (!username || username.length < 3) {
      setError('username', 'At least 3 characters required.'); ok = false;
    }

    const phone = phoneInput?.value.replace(/\D/g, '') || '';
    if (!phone || phone.length < 10) {
      setError('phone', 'Enter a valid 10-digit number.'); ok = false;
    }

    const pw = pwInput?.value || '';
    if (!pw || pw.length < 8) {
      setError('password', 'At least 8 characters required.'); ok = false;
    }

    if (!ok) {
      e.preventDefault();
      // scroll to first error
      const firstErr = form.querySelector('.has-error');
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      const txt = submitBtn.querySelector('.su-submit-text');
      if (txt) txt.textContent = 'Creating account…';
    }
  });

})();