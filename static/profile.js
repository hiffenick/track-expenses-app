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

function startOtpTimer(){
  clearInterval(otpTimerInterval);
  const timer = document.getElementById('otpTimer');

  function tick() {
    const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
    timer.textContent = `00:${String(secondsLeft).padStart(2, '0')}`;
  }

  tick(); // run immediately
  otpTimerInterval = setInterval(tick, 1000);
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

// replace with
document.getElementById('openOtpFlowBtn')
?.addEventListener('click', (e) => {
  e.preventDefault();
  otpModal.classList.add('active');
  resetOtpInputs();
  updateOtpStatus('Enter the code from your authenticator app');
  startOtpTimer();
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
                  showToast('Authenticator verified 🔐', 'success');
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
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

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
            updateOtpStatus('Enter the code from your authenticator app');
            startOtpTimer();
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
