/**
 * add_expense.js — Expenso · Add Expense Page
 * Place at: static/js/add_expense.js
 * Depends on: dashboard.js (sidebar/toast helpers already loaded)
 */

/* ── DOM refs ─────────────────────────────────────────────── */
let form, amountInput, titleInput, categoryInput, dateInput, noteInput, noteCount, submitBtn, clearBtn;

// preview
let previewAmount,
    previewTitle,
    previewCat,
    previewCatEmoji,
    previewCatLabel,
    previewDate,
    previewNote,
    previewBadge;

/* ── Helpers ──────────────────────────────────────────────── */
const fmt = v => {
  const n = parseFloat(v);
  if (isNaN(n)) return '₹0.00';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = iso => {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return iso; }
};

function setFieldError(inputId, errorId, msg) {
  const input = document.getElementById(inputId);
  const errEl = document.getElementById(errorId);
  if (!input || !errEl) return;
  errEl.textContent = msg || '';
  if (msg) {
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
  } else {
    input.classList.remove('is-invalid');
    if (input.value) input.classList.add('is-valid');
  }
}

function clearFieldError(inputId, errorId) {
  setFieldError(inputId, errorId, '');
}

/* ── Category chips ───────────────────────────────────────── */
let selectedCatData = null;

/* ── Live preview update ──────────────────────────────────── */
function updatePreview() {
  if (!previewAmount) return;

  const amount = amountInput?.value;
  const title  = titleInput?.value?.trim();
  const date   = dateInput?.value;
  const note   = noteInput?.value?.trim();
  const filled = amount && parseFloat(amount) > 0 && title && categoryInput?.value && date;

  previewAmount.textContent = fmt(amount);

  previewTitle.textContent = title || 'Transaction title';
  previewTitle.style.color = title ? 'var(--text-primary)' : 'var(--text-muted)';

  if (selectedCatData?.label) {
    previewCatEmoji.textContent = selectedCatData.emoji || '💸';
    previewCatLabel.textContent = selectedCatData.label;
    previewCat.classList.add('has-cat');
  } else {
    previewCatEmoji.textContent = '💸';
    previewCatLabel.textContent = 'No category';
    previewCat.classList.remove('has-cat');
  }

  previewDate.textContent = fmtDate(date);
  previewNote.textContent = note || '';

  if (filled) {
    previewBadge.textContent = 'Ready';
    previewBadge.classList.add('ready');
  } else {
    previewBadge.textContent = 'Unsaved';
    previewBadge.classList.remove('ready');
  }
}

/* ── Note char counter ────────────────────────────────────── */
function updateCharCount() {
  const len = noteInput?.value?.length || 0;
  if (noteCount) {
    noteCount.textContent = `${len} / 400`;
    noteCount.style.color = len > 360 ? 'var(--rose)' : 'var(--text-muted)';
  }
}

/* ── Client-side validation ───────────────────────────────── */
function validateForm() {
  let valid = true;

  const amt = parseFloat(amountInput?.value);
  if (!amountInput?.value || isNaN(amt) || amt <= 0) {
    amountInput?.classList.add('is-invalid');
    showToast('Please enter a valid amount.', 2200);
    valid = false;
  } else {
    amountInput?.classList.remove('is-invalid');
    amountInput?.classList.add('is-valid');
  }

  if (!titleInput?.value?.trim()) {
    setFieldError('title', 'titleError', 'Title is required.');
    valid = false;
  } else {
    clearFieldError('title', 'titleError');
  }

  if (!categoryInput?.value) {
    const errEl = document.getElementById('categoryError');
    if (errEl) errEl.textContent = 'Please select a category.';
    valid = false;
  } else {
    const errEl = document.getElementById('categoryError');
    if (errEl) errEl.textContent = '';
  }

  if (!dateInput?.value) {
    setFieldError('date', 'dateError', 'Date is required.');
    valid = false;
  } else {
    clearFieldError('date', 'dateError');
  }

  return valid;
}

/* ── Clear / reset ────────────────────────────────────────── */
function resetForm() {
  form?.reset();
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) dateInput.value = today;

  document.querySelectorAll('.ae-cat-chip').forEach(c => c.classList.remove('selected'));
  if (categoryInput) categoryInput.value = '';
  selectedCatData = null;

  document.querySelectorAll('.ae-input').forEach(el => {
    el.classList.remove('is-valid', 'is-invalid');
  });
  document.querySelectorAll('.ae-field-error').forEach(el => el.textContent = '');

  updatePreview();
  updateCharCount();
}

/* ── Single DOMContentLoaded ──────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {

  /* Modal */
  const modal     = document.getElementById("categoryModal");
  const openBtn   = document.getElementById("openCustomCategory");
  const closeBtn  = document.getElementById("closeCategoryModal");
  const cancelBtn = document.getElementById("cancelCategoryModal");

  if (openBtn)   openBtn.addEventListener("click",  () => modal?.classList.add("active"));
  if (closeBtn)  closeBtn.addEventListener("click",  () => modal?.classList.remove("active"));
  if (cancelBtn) cancelBtn.addEventListener("click", () => modal?.classList.remove("active"));
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  /* DOM refs */
  form          = document.getElementById('addExpenseForm');
  amountInput   = document.getElementById('amount');
  titleInput    = document.getElementById('title');
  categoryInput = document.getElementById('category');
  dateInput     = document.getElementById('date');
  noteInput     = document.getElementById('note');
  noteCount     = document.getElementById('noteCount');
  submitBtn     = document.getElementById('submitBtn');
  clearBtn      = document.getElementById('clearBtn');

  /* Clear button */
  clearBtn?.addEventListener('click', () => {
    if (confirm('Clear all fields?')) resetForm();
  });

  /* Preview refs */
  previewAmount   = document.getElementById('previewAmount');
  previewTitle    = document.getElementById('previewTitle');
  previewCat      = document.getElementById('previewCat');
  previewCatEmoji = document.getElementById('previewCatEmoji');
  previewCatLabel = document.getElementById('previewCatLabel');
  previewDate     = document.getElementById('previewDate');
  previewNote     = document.getElementById('previewNote');
  previewBadge    = document.getElementById('previewBadge');

  /* Live update listeners */
  amountInput?.addEventListener('input', updatePreview);

  titleInput?.addEventListener('input', () => {
    clearFieldError('title', 'titleError');
    updatePreview();
  });

  dateInput?.addEventListener('input', () => {
    clearFieldError('date', 'dateError');
    updatePreview();
  });

  noteInput?.addEventListener('input', () => {
    updateCharCount();
    updatePreview();
  });

  /* Blur validation */
  titleInput?.addEventListener('blur', () => {
    if (titleInput.value.trim()) {
      clearFieldError('title', 'titleError');
      titleInput.classList.add('is-valid');
    }
  });

  dateInput?.addEventListener('blur', () => {
    if (dateInput.value) {
      clearFieldError('date', 'dateError');
      dateInput.classList.add('is-valid');
    }
  });

  amountInput?.addEventListener('blur', () => {
    const v = parseFloat(amountInput.value);
    if (!isNaN(v) && v > 0) {
      amountInput.classList.remove('is-invalid');
      amountInput.classList.add('is-valid');
    }
  });

  /* Keyboard shortcut */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      submitBtn?.click();
    }
  });

  /* Category chip selection (existing chips from server) */
  document.querySelectorAll('.ae-cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (!chip.dataset.value) return;  // ← skip the Custom button
      document.querySelectorAll('.ae-cat-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      const val   = chip.dataset.value;
      const label = chip.dataset.label;
      const emoji = chip.querySelector('.ae-cat-emoji')?.textContent || '💸';
      categoryInput.value = val;
      selectedCatData = { id: val, label, emoji };
      clearFieldError('category', 'categoryError');
      updatePreview();
    });
  });

  /* Form submit */
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm()) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData,
        credentials: "same-origin"
      });

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON response:", text);
        showToast("Server returned invalid response");
        return;
      }

      if (data.success) {
        showToast('✓ ' + (data.message || 'Expense added!'), 2600);
        resetForm();
        if (data.redirect) {
          setTimeout(() => { window.location.href = data.redirect; }, 1200);
        }
      } else {
        const errors = data.errors || ['Something went wrong.'];
        errors.forEach(err => showToast(err, 3000));
      }

    } catch (err) {
      console.error('Submit failed:', err);
      showToast("Request failed. Try again.");
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  /* Save custom category */
  const saveCategoryBtn = document.getElementById("saveCategoryBtn");
  if (saveCategoryBtn) {
    saveCategoryBtn.addEventListener("click", async () => {
      const name = document.getElementById("customCategoryName").value.trim();
      const icon = document.getElementById("customCategoryEmoji").value.trim();

      if (!name) {
        alert("Category name required");
        return;
      }

      try {
        const csrfToken = document
          .querySelector('meta[name="csrf-token"]')
          .getAttribute('content');

        const response = await fetch("/create-category", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken
          },
          body: JSON.stringify({ name, icon })
        });

        const text = await response.text();
        const data = JSON.parse(text);

        if (data.success) {
          addCategoryChip(data.category);
          document.getElementById("categoryModal")?.classList.remove("active");
          document.getElementById("customCategoryName").value = "";
          document.getElementById("customCategoryEmoji").value = "";
        } else {
          alert(data.message || "Something went wrong");
        }

      } catch (error) {
        console.error(error);
      }
    });
  }

  /* Init */
  updatePreview();
  updateCharCount();
  amountInput?.focus();

}); // ── end DOMContentLoaded ───────────────────────────────────

/* ── Add category chip (called after successful create) ───── */
function addCategoryChip(category) {
  const grid = document.getElementById("categoryGrid");
  const chip = document.createElement("button");

  chip.type = "button";
  chip.className = "ae-cat-chip selected";
  chip.dataset.value = category.id;
  chip.dataset.label = category.name;

  chip.innerHTML = `
    <span class="ae-cat-emoji">${category.icon || "✨"}</span>
    <span class="ae-cat-label">${category.name}</span>
    
  `;

  document.querySelectorAll(".ae-cat-chip").forEach(btn => btn.classList.remove("selected"));
  chip.classList.add("selected");

  categoryInput.value = category.id;
  selectedCatData = {
    id: category.id,
    label: category.name,
    emoji: category.icon || "✨"
  };

  clearFieldError("category", "categoryError");
  updatePreview();

  chip.addEventListener("click", () => {
    document.querySelectorAll(".ae-cat-chip").forEach(btn => btn.classList.remove("selected"));
    chip.classList.add("selected");
    categoryInput.value = category.id;
    selectedCatData = {
      id: category.id,
      label: category.name,
      emoji: category.icon || "✨"
    };
    clearFieldError("category", "categoryError");
    updatePreview();
  });

  grid.appendChild(chip);
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


/* ── Delete category chip ─────────────────────────────────── */
