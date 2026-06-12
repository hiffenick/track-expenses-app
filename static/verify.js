/* ============================================================
   verify.js — Expenso · Verify OTP Page
   ============================================================ */

(function () {
  'use strict';

  /* ── OTP box → hidden input sync ────────────────────────── */
  const boxes     = Array.from(document.querySelectorAll('.vf-otp-box'));
  const hidden    = document.getElementById('otpHidden');
  const fieldWrap = document.getElementById('field-otp');
  const errEl     = document.getElementById('err-otp');

  function syncHidden() {
    if (hidden) hidden.value = boxes.map(b => b.value).join('');
  }

  function markFilled(box) {
    if (box.value) box.classList.add('is-filled');
    else           box.classList.remove('is-filled');
  }

  function clearBoxErrors() {
    boxes.forEach(b => b.classList.remove('has-error'));
    if (fieldWrap) fieldWrap.classList.remove('has-error');
    if (errEl)     { errEl.textContent = ''; errEl.style.display = 'none'; }
  }

  function showBoxError(msg) {
    boxes.forEach(b => b.classList.add('has-error'));
    if (fieldWrap) fieldWrap.classList.add('has-error');
    if (errEl)     { errEl.textContent = msg; errEl.style.display = 'block'; }
  }

  /* Auto-advance and backspace navigation */
  boxes.forEach((box, i) => {

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!box.value && i > 0) {
          boxes[i - 1].focus();
          boxes[i - 1].value = '';
          markFilled(boxes[i - 1]);
          syncHidden();
        }
      }
    });

    box.addEventListener('input', () => {
      /* Allow only single digits */
      box.value = box.value.replace(/\D/g, '').slice(-1);
      markFilled(box);
      syncHidden();
      clearBoxErrors();

      if (box.value && i < boxes.length - 1) {
        boxes[i + 1].focus();
      }
    });

    /* Handle paste into any box */
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, 6);

      pasted.split('').forEach((char, ci) => {
        if (boxes[ci]) {
          boxes[ci].value = char;
          markFilled(boxes[ci]);
        }
      });
      syncHidden();
      clearBoxErrors();

      /* Focus last filled or next empty */
      const nextEmpty = boxes.find(b => !b.value);
      (nextEmpty || boxes[boxes.length - 1]).focus();
    });

    /* Prevent non-numeric keys */
    box.addEventListener('keypress', (e) => {
      if (!/[0-9]/.test(e.key)) e.preventDefault();
    });
  });

  /* ── Countdown timer (10 min) ────────────────────────────── */
  const countdownEl  = document.getElementById('leftCountdown');
  const resendLink   = document.getElementById('resendLink');
  let   totalSeconds = 30;

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function tickCountdown() {
    if (!countdownEl) return;
    countdownEl.textContent = formatTime(totalSeconds);

    if (totalSeconds <= 0) {
      totalSeconds = 30;
      countdownEl.style.color = '#f0f0f0ff';
      if (resendLink) resendLink.classList.remove('is-disabled');
      tickCountdown();
    }

    if (totalSeconds <= 10) {
      countdownEl.style.color = '#f87171';
    } else if (totalSeconds <= 180) {
      countdownEl.style.color = '#f4f4f4ff';
    }

    totalSeconds--;
    setTimeout(tickCountdown, 1000);
  }

  /* Disable resend initially, enable when expired */
  if (resendLink) resendLink.classList.add('is-disabled');
  tickCountdown();

  /* Resend click — reset timer */
  resendLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (resendLink.classList.contains('is-disabled')) return;

    /* Reset timer */
    totalSeconds = 10 * 60;
    if (countdownEl) {
      countdownEl.style.color = '';
      countdownEl.textContent = formatTime(totalSeconds);
    }
    resendLink.classList.add('is-disabled');

    /* Clear boxes */
    boxes.forEach(b => { b.value = ''; markFilled(b); });
    if (hidden) hidden.value = '';
    boxes[0]?.focus();
    clearBoxErrors();

    tickCountdown();
  });

  /* ── Submit guard ────────────────────────────────────────── */
  const form      = document.getElementById('verifyForm');
  const submitBtn = document.getElementById('submitBtn');

  form?.addEventListener('submit', (e) => {
    syncHidden();
    const val = (hidden?.value || '').replace(/\D/g, '');

    if (val.length < 6) {
      e.preventDefault();
      showBoxError('Enter the complete 6-digit code.');
      boxes[val.length]?.focus();
      return;
    }

    /* loading state */
    if (submitBtn) {
      submitBtn.disabled = true;
      const txt = submitBtn.querySelector('.vf-submit-text');
      if (txt) txt.textContent = 'Verifying…';
    }
  });

  /* Auto-focus first box on load */
  boxes[0]?.focus();

})();