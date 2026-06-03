// Teleport toast to body so backdrop-filter modals can't trap it
// Create toast fresh, appended directly to body — bypasses all stacking contexts
let _toastEl = document.getElementById('navToast');
if (_toastEl) _toastEl.remove(); // remove the HTML one entirely

_toastEl = document.createElement('div');
_toastEl.id = 'navToast';
_toastEl.style.cssText = `
    position: fixed !important;
    top: 24px !important;
    right: 24px !important;
    min-width: 260px;
    max-width: 340px;
    padding: 14px 18px;
    border-radius: 14px;
    background: rgba(15,17,23,0.96);
    border: 1px solid rgba(255,255,255,0.08);
    color: white;
    font-size: 0.92rem;
    font-weight: 500;
    box-shadow: 0 14px 40px rgba(0,0,0,0.35);
    z-index: 999999 !important;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-12px);
    transition: opacity .25s ease, transform .25s ease, visibility .25s ease;
    pointer-events: none;
`;
document.body.appendChild(_toastEl);

/* ============================ */
/* SUB-NAV ACTIVE STATE */
/* ============================ */

const navItems = document.querySelectorAll('.ps-nav-item');

navItems.forEach(item => {
  item.addEventListener('click', () => {

    navItems.forEach(i => {
      i.classList.remove('ps-nav-item--active');
      i.querySelector('.ps-nav-iconwrap')?.classList.remove('ps-nav-iconwrap--accent');
    });

    item.classList.add('ps-nav-item--active');
    item.querySelector('.ps-nav-iconwrap')?.classList.add('ps-nav-iconwrap--accent');

  });
});


/* ============================ */
/* AVATAR PREVIEW */
/* ============================ */

const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');
const avatarInitial = document.getElementById('avatarInitial');

if (avatarInput) {
  avatarInput.addEventListener('change', function () {

    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {

      if (avatarInitial) avatarInitial.style.display = 'none';

      const existing = avatarPreview.querySelector('img');
      if (existing) existing.remove();

      const img = document.createElement('img');
      img.src = e.target.result;

      avatarPreview.appendChild(img);
    };

    reader.readAsDataURL(file);
  });
}


/* ============================ */
/* PROFILE FORM LOADING STATE */
/* ============================ */

const profileForm = document.getElementById('profileForm');

if (profileForm) {
  profileForm.addEventListener('submit', () => {

    const btn = profileForm.querySelector('.ae-btn-primary');

    if (btn) {
      btn.classList.add('loading');
      btn.disabled = true;
    }

  });
}


/* ============================ */
/* OTP INPUT HANDLING */
/* ============================ */

const otpInputs = document.querySelectorAll('.otp-input');
const finalOtpInput = document.getElementById('finalOtpInput');

otpInputs.forEach((input, index) => {

  input.addEventListener('input', (e) => {

    e.target.value = e.target.value.replace(/[^0-9]/g, '');

    if (e.target.value && index < otpInputs.length - 1) {
      otpInputs[index + 1].focus();
    }

    combineOtp();
  });

  input.addEventListener('keydown', (e) => {

    if (e.key === 'Backspace' && !input.value && index > 0) {
      otpInputs[index - 1].focus();
    }

  });

});

function combineOtp() {
  let otp = '';

  otpInputs.forEach(input => {
    otp += input.value;
  });

  finalOtpInput.value = otp;
}

/* ============================ */
/* RESET OTP */
/* ============================ */

function resetOtpInputs(){

  otpInputs.forEach(input => {
    input.value = '';
  });

  finalOtpInput.value = '';

  otpInputs[0]?.focus();

}


/* ============================ */
/* SHAKE ANIMATION */
/* ============================ */

function shakeOtpInputs(){

  const group =
    document.querySelector('.otp-input-group');

  group.classList.add('otp-shake');

  setTimeout(() => {
    group.classList.remove('otp-shake');
  }, 500);

}


/* ============================ */
/* OTP STATUS */
/* ============================ */

function updateOtpStatus(message){

  const status =
    document.getElementById('otpStatusText');

  if(status){
    status.textContent = message;
  }

}


/* ============================ */
/* OTP TIMER */
/* ============================ */

let otpTimerInterval;

function startOtpTimer(seconds){

  clearInterval(otpTimerInterval);

  const timer =
    document.getElementById('otpTimer');

  let remaining = seconds;

  otpTimerInterval = setInterval(() => {

    const mins =
      String(Math.floor(remaining / 60))
      .padStart(2, '0');

    const secs =
      String(remaining % 60)
      .padStart(2, '0');

    timer.textContent =
      `${mins}:${secs}`;

    if(remaining <= 0){

      clearInterval(otpTimerInterval);

      timer.textContent =
        'Expired';

      updateOtpStatus(
        'OTP expired. Resend again.'
      );

    }

    remaining--;

  }, 1000);

}


/* ============================ */
/* MODALS */
/* ============================ */

const passwordModal = document.getElementById('passwordModalOverlay');
const otpModal = document.getElementById('otpModalOverlay');

const closePasswordModal = document.getElementById('closePasswordModal');
const closeOtpModal = document.getElementById('closeOtpModal');


/* ============================ */
/* OTP FLOW (FIXED - NO 302 EXPECTED) */
/* ============================ */


document.getElementById('openOtpFlowBtn')
?.addEventListener('click', async (e) => {
  e.preventDefault();

  // Show modal immediately, reset inputs, show loading state
  otpModal.classList.add('active');
  resetOtpInputs();
  updateOtpStatus('Sending OTP…');

  try {
    const csrfToken = document.querySelector(
      '#sendOtpForm input[name="csrf_token"]'
    )?.value;

    const response = await fetch('/send-password-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      credentials: 'same-origin',
      body: `csrf_token=${encodeURIComponent(csrfToken)}`
    });

    const data = await response.json();

    if (response.ok && data.success) {
      updateOtpStatus('OTP sent successfully 💌');
      startOtpTimer(120);
    } else {
      updateOtpStatus(data.message || 'Failed to send OTP');
      showToast(data.message || 'Failed to send OTP', 'error');
    }

  } catch (err) {
    console.error(err);
    updateOtpStatus('Something went wrong');
    showToast('Something went wrong', 'error');
  }
});



/* ============================ */
/* VERIFY OTP SUBMIT (OPTIONAL AJAX IMPROVEMENT) */
/* ============================ */

const otpVerifyForm =
  document.getElementById('otpVerifyForm');

otpVerifyForm?.addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();

    try {

      combineOtp();

      const formData =
        new FormData(otpVerifyForm);

      const response = await fetch(
        '/verify-password-otp',
        {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        }
      );

      const data =
        await response.json();

      if (data.success) {
    otpModal.classList.remove('active');

    if (data.purpose === 'delete_account') {
        const csrfToken = document.querySelector('input[name="csrf_token"]')?.value;

        const res = await fetch('/delete-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `csrf_token=${encodeURIComponent(csrfToken)}`
        });

        const result = await res.json();

if (result.success) {
    window.location.href = result.redirect;
} else {
    showToast(result.message || 'Failed to delete account', 'error');
}

              } else {
                  // password change flow
                  passwordModal.classList.add('active');
                  showToast('OTP verified 🔐', 'success');
              }

          } else {
              shakeOtpInputs();
              resetOtpInputs();
              showToast(data.message || 'Invalid OTP', 'error');
          }
    } catch(err){

      console.log(err);

      showToast(
        'Verification failed'
      );

    }

});


/* ============================ */
/* MODAL CLOSE EVENTS */
/* ============================ */

closePasswordModal?.addEventListener('click', () => {
  passwordModal.classList.remove('active');
});

closeOtpModal?.addEventListener('click', () => {
  otpModal.classList.remove('active');
});


window.addEventListener('click', (e) => {

  if (e.target === passwordModal) {
    passwordModal.classList.remove('active');
  }

  if (e.target === otpModal) {
    otpModal.classList.remove('active');
  }

});


/* ============================ */
/* SIMPLE TOAST SYSTEM */
/* ============================ */

function showToast(message, type = "success") {
    _toastEl.textContent = message;

    // reset border color
    _toastEl.style.borderColor = type === 'error'
        ? 'rgba(248,113,113,0.28)'
        : 'rgba(74,222,128,0.28)';

    // force reflow
    void _toastEl.offsetHeight;

    _toastEl.style.opacity = '1';
    _toastEl.style.visibility = 'visible';
    _toastEl.style.transform = 'translateY(0)';

    clearTimeout(_toastEl._hideTimer);
    _toastEl._hideTimer = setTimeout(() => {
        _toastEl.style.opacity = '0';
        _toastEl.style.visibility = 'hidden';
        _toastEl.style.transform = 'translateY(-12px)';
    }, 3000);
}

const deletePasswordModal =
  document.getElementById('deletePasswordModal');

document.querySelector('.ps-action-row--danger')
?.addEventListener('click', (e) => {
  e.preventDefault();
  deletePasswordModal.classList.add('active');
});

document.getElementById('closeDeletePasswordModal')
?.addEventListener('click', () => {
  deletePasswordModal.classList.remove('active');
});

document.getElementById('deletePasswordForm')
?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
        const formData = new FormData(e.target);
        const csrfToken = e.target.querySelector('input[name="csrf_token"]')?.value;

        const res = await fetch('/send-delete-otp', {
            method: 'POST',
            headers: { 'X-CSRFToken': csrfToken },
            body: formData,
            credentials: 'same-origin'
        });

        const data = JSON.parse(await res.text());

        if (data.success) {
            deletePasswordModal.classList.remove('active');
            otpModal.classList.add('active');
            resetOtpInputs();
            updateOtpStatus('OTP sent successfully 💌');
            startOtpTimer(120);
        } else {
            showModalError('deleteErrorBanner', 'deleteErrorText', data.message || 'Incorrect password');
        }

    } catch (err) {
        showModalError('deleteErrorBanner', 'deleteErrorText', 'Something went wrong');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Send OTP'; }
    }
});

function showModalError(bannerId, textId, message) {
    const banner = document.getElementById(bannerId);
    const text = document.getElementById(textId);
    if (!banner || !text) return;
    text.textContent = message;
    banner.style.display = 'block';
    banner.className = 'ps-error-banner';
    clearTimeout(banner._t);
    banner._t = setTimeout(() => {
        banner.style.display = 'none';
    }, 4000);
}

function showModalSuccess(bannerId, textId, message) {
    const banner = document.getElementById(bannerId);
    const text = document.getElementById(textId);
    if (!banner || !text) return;
    text.textContent = message;
    banner.style.display = 'block';
    banner.className = 'ps-success-banner';
    clearTimeout(banner._t);
    banner._t = setTimeout(() => {
        banner.style.display = 'none';
    }, 4000);
}

/* ── Search ───────────────────────────────────────────────── */
const searchBtn     = document.querySelector('.icon-btn[title="Search"]');
const searchModal   = document.getElementById('searchModal');
const searchInput   = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

const ICONS = {
  food:'🍔', dining:'🍔', transport:'🚌', travel:'✈️',
  shopping:'🛍️', entertainment:'🎬', health:'💊',
  medical:'💊', utilities:'💡', bills:'💡',
  groceries:'🛒', education:'📚',
};
const getIcon = cat => {
  const k = (cat||'').toLowerCase();
  for (const [key, v] of Object.entries(ICONS)) if (k.includes(key)) return v;
  return '💸';
};

// App pages/features that are searchable
const APP_FEATURES = [
  { name: 'Add Expense',       desc: 'Log a new transaction',     icon: '➕', url: '/addexpense' },
  { name: 'View Expenses',     desc: 'Browse all your records',   icon: '📄', url: '/viewexps' },
  { name: 'Analytics',         desc: 'Insights and trends',       icon: '📊', url: '/analytics' },
  { name: 'Categories',        desc: 'Manage expense groups',     icon: '📁', url: '/categories' },
  { name: 'Profile & Settings',desc: 'Account and preferences',   icon: '👤', url: '/profile' },
  { name: 'Dashboard',         desc: 'Back to overview',          icon: '🏠', url: '/dashboard' },
];

function openSearch() {
  searchModal.style.display = 'flex';
  searchInput.value = '';
  showDefaultResults();
  setTimeout(() => searchInput.focus(), 80);
}

function closeSearch() {
  searchModal.style.display = 'none';
}

// Show app features by default (before typing)
function showDefaultResults() {
  searchResults.innerHTML = `
    <div class="search-section-label">Pages</div>
    ${APP_FEATURES.map(f => featureHTML(f)).join('')}
  `;
}

function featureHTML(f) {
  return `
    <div class="search-item" onclick="window.location.href='${f.url}'">
      <div class="search-item-icon">${f.icon}</div>
      <div class="search-item-info">
        <div class="search-item-name">${f.name}</div>
        <div class="search-item-meta">${f.desc}</div>
      </div>
      <div class="search-item-arrow">→</div>
    </div>
  `;
}

function expenseHTML(exp) {
  return `
    <div class="search-item">
      <div class="search-item-icon">${getIcon(exp.category)}</div>
      <div class="search-item-info">
        <div class="search-item-name">${exp.title  || 'Expense'}</div>
        <div class="search-item-meta">${exp.category || 'Uncategorised'} · ${exp.date || ''}</div>
      </div>
      <div class="search-item-amount">₹${Number(exp.amount).toLocaleString('en-IN')}</div>
    </div>
  `;
}

searchBtn?.addEventListener('click', openSearch);
searchModal?.addEventListener('click', e => { if (e.target === searchModal) closeSearch(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });

// Only load expenses that were server-rendered for THIS user
const allExpenses = JSON.parse(document.getElementById('expenses-data')?.textContent || '[]');

searchInput?.addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();

  if (!q) { showDefaultResults(); return; }

  const matchedFeatures = APP_FEATURES.filter(f =>
    f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
  );

  const matchedExpenses = allExpenses.filter(exp =>
    (exp.title||'').toLowerCase().includes(q) ||
    (exp.category||'').toLowerCase().includes(q)
  );

  if (!matchedFeatures.length && !matchedExpenses.length) {
    searchResults.innerHTML = '<div class="search-empty">No results found.</div>';
    return;
  }

  let html = '';

  if (matchedFeatures.length) {
    html += `<div class="search-section-label">Pages</div>`;
    html += matchedFeatures.map(featureHTML).join('');
  }

  if (matchedExpenses.length) {
    html += `<div class="search-section-label">Expenses</div>`;
    html += matchedExpenses.slice(0, 6).map(expenseHTML).join('');
  }

  searchResults.innerHTML = html;
});


/* ── Notifications ────────────────────────────────────────── */
const notifBtn      = document.querySelector('.notif-btn');
const notifPanel    = document.getElementById('notifPanel');
const notifBackdrop = document.getElementById('notifBackdrop');
const notifList     = document.getElementById('notifList');
const notifClearAll = document.getElementById('notifClearAll');
const notifDot      = document.querySelector('.notif-dot');

function buildNotifications() {
  const summary = JSON.parse(document.getElementById('summary-data')?.textContent || '{}');
  const notes = [];

  if (summary.monthly_spent > 0)
    notes.push({ icon:'📅', text:`You've spent ₹${Number(summary.monthly_spent).toLocaleString('en-IN')} this month.`, unread: true });

  if (summary.top_category)
    notes.push({ icon:'📊', text:`Your top category is <b>${summary.top_category}</b>.`, unread: true });

  if (summary.trend_percent > 20)
    notes.push({ icon:'⚠️', text:`Spending up <b>${summary.trend_percent.toFixed(1)}%</b> vs last month.`, unread: true });
  else if (summary.trend_percent < 0)
    notes.push({ icon:'✅', text:`Spending down <b>${Math.abs(summary.trend_percent).toFixed(1)}%</b> vs last month.`, unread: false });

  if (!notes.length)
    notes.push({ icon:'💡', text:'Add your first expense to get started!', unread: false });

  return notes;
}

let notifications = buildNotifications();

function renderNotifs() {
  if (!notifications.length) {
    notifList.innerHTML = '<div class="notif-empty">No notifications</div>';
    if (notifDot) notifDot.style.display = 'none';
    return;
  }

  const hasUnread = notifications.some(n => n.unread);
  if (notifDot) notifDot.style.display = hasUnread ? 'block' : 'none';

  notifList.innerHTML = notifications.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <div class="notif-item-icon">${n.icon}</div>
      <div class="notif-item-body">
        <div class="notif-item-title">${n.text}</div>
        <div class="notif-item-time">Just now</div>
      </div>
      ${n.unread ? '<div class="notif-unread-dot"></div>' : ''}
    </div>
  `).join('');
}

function openNotifPanel() {
  notifPanel.classList.add('open');
  notifBackdrop.classList.add('open');
  notifications = notifications.map(n => ({ ...n, unread: false }));
  if (notifDot) notifDot.style.display = 'none';
  renderNotifs();
}

function closeNotifPanel() {
  notifPanel.classList.remove('open');
  notifBackdrop.classList.remove('open');
}

notifBtn?.addEventListener('click', e => {
  e.stopPropagation();
  notifPanel.classList.contains('open') ? closeNotifPanel() : openNotifPanel();
});

notifBackdrop?.addEventListener('click', closeNotifPanel);

notifClearAll?.addEventListener('click', () => {
  notifications = [];
  renderNotifs();
  closeNotifPanel();
});

// render dot on page load
renderNotifs();
