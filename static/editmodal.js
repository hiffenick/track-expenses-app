/**
 * edit_modal.js — Expenso · Edit Expense Modal
 * Place at: static/js/edit_modal.js
 *
 * Load AFTER viewexpense.js in your HTML:
 *   <script src="{{ url_for('static', filename='js/edit_modal.js') }}"></script>
 *
 * Expects:
 *   • The edit modal HTML to be present in the page
 *   • RAW_EXPENSES array (defined in viewexpense.js, window-scoped or accessible)
 *   • CATEGORIES array from the categories-data JSON blob
 *   • Flask route:  PUT /expenses/edit/<id>  → JSON { success, expense?, message? }
 *   • showToast() available from dashboard.js
 *   • window.ecHandleEdit(id) called from the ec-btn--edit buttons in the expense rows
 *
 * HOW IT WORKS
 * ────────────
 * 1. ecHandleEdit(id) is called from the edit button click in the expense row.
 * 2. We look up the expense in RAW_EXPENSES by id.
 * 3. We populate all modal fields with the existing data.
 * 4. We show the modal.
 * 5. On Save, we validate, call PUT /expenses/edit/<id> with JSON body.
 * 6. On success, we update RAW_EXPENSES in memory, update the DOM row
 *    directly (no full re-render needed), and close the modal.
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   BOOTSTRAP — read categories for the chip grid
═══════════════════════════════════════════════════════════════ */
let EM_CATEGORIES = [];
try {
  EM_CATEGORIES = JSON.parse(
    document.getElementById('categories-data')?.textContent || '[]'
  );
} catch (e) {}

/* Fallback if categories-data is empty / missing */
if (!EM_CATEGORIES.length) {
    EM_CATEGORIES = [
    { id: 1, name: 'Food & Dining',    icon: '🍔' },
    { id: 2, name: 'Transport',        icon: '🚌' },
    { id: 3, name: 'Shopping',         icon: '🛍️' },
    { id: 4, name: 'Entertainment',    icon: '🎬' },
    { id: 5, name: 'Health & Medical', icon: '💊' },
    { id: 6, name: 'Utilities',        icon: '💡' },
    { id: 7, name: 'Groceries',        icon: '🛒' },
    { id: 8, name: 'Education',        icon: '📚' },
    { id: 9, name: 'Travel',           icon: '✈️' },
    { id: 10, name: 'Other',           icon: '💸' },
    ];
}

/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
let emCurrentId       = null;
let emSelectedCatId   = null;

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function emFmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function emSetError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (el) el.textContent = msg || '';
}

function emClearErrors() {
  ['emTitleError', 'emCategoryError', 'emDateError'].forEach(id => emSetError(id, ''));
  document.getElementById('emErrorBanner').hidden = true;
  document.getElementById('emAmount')?.classList.remove('is-invalid');
  document.getElementById('emTitle')?.classList.remove('is-invalid');
}

function emShowBanner(msg) {
  const banner = document.getElementById('emErrorBanner');
  const text   = document.getElementById('emErrorText');
  if (banner && text) {
    text.textContent = msg;
    banner.hidden    = false;
  }
}

function emSetLoading(on) {
  const btn = document.getElementById('editModalSave');
  if (!btn) return;
  btn.disabled = on;
  btn.classList.toggle('loading', on);
}

/* ═══════════════════════════════════════════════════════════════
   CATEGORY CHIP GRID
═══════════════════════════════════════════════════════════════ */
function emBuildCatGrid() {
  const grid = document.getElementById('emCatGrid');
  if (!grid) return;

  grid.innerHTML = EM_CATEGORIES.map(cat => `
    <button type="button"
            class="em-cat-chip"
            data-id="${cat.id}"
            data-label="${cat.name}"
            data-icon="${cat.icon || '💸'}">
      <span class="em-chip-emoji">${cat.icon || '💸'}</span>
      <span class="em-chip-label">${cat.name}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.em-cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      grid.querySelectorAll('.em-cat-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      emSelectedCatId = chip.dataset.id;
      document.getElementById('emCategory').value = emSelectedCatId;
      emSetError('emCategoryError', '');
    });
  });
}

function emSelectCat(catId) {
  /* Try exact id match first, then fallback to label/name lowercase match */
  const grid = document.getElementById('emCatGrid');
  if (!grid) return;

  let matched = false;
  grid.querySelectorAll('.em-cat-chip').forEach(chip => {
    chip.classList.remove('selected');
    const idMatch    = chip.dataset.id    === catId;
    const labelMatch = chip.dataset.label?.toLowerCase() === catId?.toLowerCase();
    if (idMatch || labelMatch) {
      chip.classList.add('selected');
      emSelectedCatId = chip.dataset.id;
      document.getElementById('emCategory').value = emSelectedCatId;
      matched = true;
    }
  });

  if (!matched && catId) {
    /* category not in the list — still store the value so we don't wipe it */
    emSelectedCatId = catId;
    document.getElementById('emCategory').value = catId;
  }
}

/* ═══════════════════════════════════════════════════════════════
   OPEN MODAL — populate with expense data
═══════════════════════════════════════════════════════════════ */
function emOpen(expense) {
  emCurrentId = expense.id;
  emClearErrors();

  /* Amount */
  const amtEl = document.getElementById('emAmount');
  if (amtEl) amtEl.value = expense.amount ?? '';

  /* Title */
  const titleEl = document.getElementById('emTitle');
  if (titleEl) titleEl.value = expense.title ?? '';

  /* Date — input[type=date] wants YYYY-MM-DD */
  const dateEl = document.getElementById('emDate');
  if (dateEl) {
    dateEl.value = expense.date ?? new Date().toISOString().slice(0, 10);
    dateEl.max   = new Date().toISOString().slice(0, 10);
  }

  /* Note */
  const noteEl = document.getElementById('emNote');
  if (noteEl) noteEl.value = expense.note ?? '';

  /* Category chips */
  emSelectCat(String(expense.category_id || expense.category || ''));
  /* Show modal */
  const modal = document.getElementById('editModal');
  if (modal) {
    modal.hidden = false;
    /* Focus amount after open animation */
    setTimeout(() => amtEl?.focus(), 100);
  }

  document.body.style.overflow = 'hidden';
}

/* ═══════════════════════════════════════════════════════════════
   CLOSE MODAL
═══════════════════════════════════════════════════════════════ */
function emClose() {
  const modal = document.getElementById('editModal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
  emCurrentId     = null;
  emSelectedCatId = null;
}

/* ═══════════════════════════════════════════════════════════════
   VALIDATE
═══════════════════════════════════════════════════════════════ */
function emValidate() {
  let valid = true;
  emClearErrors();

  const amt  = parseFloat(document.getElementById('emAmount')?.value);
  const title = document.getElementById('emTitle')?.value?.trim();
  const cat   = document.getElementById('emCategory')?.value;
  const date  = document.getElementById('emDate')?.value;

  if (!document.getElementById('emAmount')?.value || isNaN(amt) || amt <= 0) {
    document.getElementById('emAmount')?.classList.add('is-invalid');
    showToast('Please enter a valid amount.', 2200);
    valid = false;
  }

  if (!title) {
    emSetError('emTitleError', 'Title is required.');
    document.getElementById('emTitle')?.classList.add('is-invalid');
    valid = false;
  }

  if (!cat) {
    emSetError('emCategoryError', 'Please select a category.');
    valid = false;
  }

  if (!date) {
    emSetError('emDateError', 'Date is required.');
    document.getElementById('emDate')?.classList.add('is-invalid');
    valid = false;
  }

  return valid;
}

/* ═══════════════════════════════════════════════════════════════
   SAVE — PUT /expenses/edit/<id>
═══════════════════════════════════════════════════════════════ */
async function emSave() {
  if (!emValidate()) return;

  const id     = emCurrentId;
  const amount = parseFloat(document.getElementById('emAmount').value);
  const title  = document.getElementById('emTitle').value.trim();
  const cat    = document.getElementById('emCategory').value;
  console.log("CAT VALUE:", cat);
  const date   = document.getElementById('emDate').value;
  const note   = document.getElementById('emNote').value.trim();

  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  emSetLoading(true);

  try {
    const resp = await fetch(`/expenses/edit/${id}`, {
      method:  'PUT',
      headers: {
        'Content-Type':     'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ amount, title, category: cat, date, note }),
    });

    const data = await resp.json();

    if (data.success) {
      /* ── Update RAW_EXPENSES in memory ─────────────────────── */
      if (typeof RAW_EXPENSES !== 'undefined') {
        const idx = RAW_EXPENSES.findIndex(e => e.id === id);
        if (idx !== -1) {
          const catObj = EM_CATEGORIES.find(c => String(c.id) === String(cat));

            RAW_EXPENSES[idx] = {
            ...RAW_EXPENSES[idx],
            amount,
            title,
            category: catObj?.label || 'other',
            category_id: Number(cat),
            icon: catObj?.icon || '💸',
            date,
            note
            };
        }
        lastStateHash = null;
        /* Re-render the view if render() is available (from viewexpense.js) */
        if (typeof render === 'function') render();
      }

      /* ── Update the visible DOM row directly ───────────────── */
      emUpdateRow(id, { amount, title, category: cat, date, note });

      showToast('✓ Expense updated!', 2400);
      emClose();
    } else {
      emShowBanner(data.message || 'Failed to update expense.');
    }

  } catch (err) {
    console.error('Edit expense error:', err);
    emShowBanner('Network error — please try again.');
  } finally {
    emSetLoading(false);
  }
}

/* ═══════════════════════════════════════════════════════════════
   UPDATE DOM ROW (optimistic UI — no full re-render needed)
═══════════════════════════════════════════════════════════════ */
function emUpdateRow(id, { amount, title, category, date, note }) {
  /* Works for both the ec-row (SSR table) and ve-expense-item (JS-rendered) */
  const row = document.querySelector(
    `[data-id="${id}"].ec-row, [data-id="${id}"].ve-expense-item`
  );
  if (!row) return;

  /* Find the category icon from EM_CATEGORIES */
  const catObj = EM_CATEGORIES.find(
    c => String(c.id) === String(category)
    );

  const icon  = catObj?.icon  || '💸';
  const label = catObj?.name || 'Other';

  /* ec-row structure (SSR table layout) */
  const badgeIcon = row.querySelector('.ec-badge-icon');
  const badgeName = row.querySelector('.ec-badge-name');
  const ecTitle   = row.querySelector('.ec-title');
  const ecNote    = row.querySelector('.ec-note');
  const ecDateEl  = row.querySelector('.ec-date-month');
  const ecAmt     = row.querySelector('.ec-amount');

  if (badgeIcon) badgeIcon.textContent = icon;
  if (badgeName) badgeName.textContent = label;
  if (ecTitle)   ecTitle.textContent   = title;
  if (ecNote)    ecNote.textContent    = note;
  if (ecDateEl)  ecDateEl.textContent  = date;
  if (ecAmt) {
    ecAmt.textContent = '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /* Also update data-* attrs so JS filters stay in sync */
  row.dataset.cat = category;
    row.dataset.catName = label.toLowerCase();
  row.dataset.date   = date;
  row.dataset.amount = amount;

  /* ve-expense-item structure (JS-rendered accordion) */
  const eiTitle  = row.querySelector('.ve-ei-title');
  const eiNote   = row.querySelector('.ve-ei-note');
  const eiDate   = row.querySelector('.ve-ei-date');
  const eiAmt    = row.querySelector('.ve-ei-amount');
  const eiBadge  = row.querySelector('.ve-ei-badge');

  if (eiBadge)  eiBadge.textContent  = icon;
  if (eiTitle)  eiTitle.textContent  = title;
  if (eiNote)   eiNote.textContent   = note;
  if (eiDate)   eiDate.textContent   = emFmtDate(date);
  if (eiAmt) {
    eiAmt.textContent = '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /* Flash row to confirm update */
  row.classList.add('em-row-updated');
  setTimeout(() => row.classList.remove('em-row-updated'), 1000);
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC HANDLER — called from ec-btn--edit onclick="ecHandleEdit(id)"
═══════════════════════════════════════════════════════════════ */
window.ecHandleEdit = function(id) {
  /* Look up expense from RAW_EXPENSES (viewexpense.js) or DOM */
  let expense = null;

  if (typeof RAW_EXPENSES !== 'undefined') {
    expense = RAW_EXPENSES.find(e => String(e.id) === String(id));
  }

  /* Fallback — read from the DOM row data attributes */
  if (!expense) {
    const row = document.querySelector(`[data-id="${id}"]`);
    if (row) {
      expense = {
        id:       id,
        amount:   parseFloat(row.dataset.amount) || 0,
        title:    row.querySelector('.ec-title, .ve-ei-title')?.textContent?.trim() || '',
        category_id: row.dataset.cat || '',
        category: row.dataset.catName || '',
        date:     row.dataset.date || '',
        note:     row.querySelector('.ec-note, .ve-ei-note')?.textContent?.trim() || '',
      };
    }
  }

  if (!expense) {
    showToast('Could not load expense data.', 2200);
    return;
  }

  emOpen(expense);
};

/* Keep the old handleEdit name working too (used in ve-expense-item buttons) */
window.handleEdit = window.ecHandleEdit;

/* ═══════════════════════════════════════════════════════════════
   BIND EVENTS
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* Build category grid once */
  emBuildCatGrid();

  /* Close button */
  document.getElementById('editModalClose')?.addEventListener('click', emClose);

  /* Cancel button */
  document.getElementById('editModalCancel')?.addEventListener('click', emClose);

  /* Save button */
  document.getElementById('editModalSave')?.addEventListener('click', emSave);

  /* Backdrop click to close */
  document.getElementById('editModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) emClose();
  });

  /* Escape key */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('editModal')?.hidden) {
      emClose();
    }
  });

  /* Ctrl/Cmd + Enter to save when modal is open */
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (!document.getElementById('editModal')?.hidden) {
        emSave();
      }
    }
  });

  /* Clear inline errors on input */
  document.getElementById('emAmount')?.addEventListener('input', () => {
    document.getElementById('emAmount').classList.remove('is-invalid');
  });
  document.getElementById('emTitle')?.addEventListener('input', () => {
    document.getElementById('emTitle').classList.remove('is-invalid');
    emSetError('emTitleError', '');
  });
  document.getElementById('emDate')?.addEventListener('input', () => {
    document.getElementById('emDate').classList.remove('is-invalid');
    emSetError('emDateError', '');
  });
});

function showToast(message, duration = 2400) {
  const toast = document.getElementById('navToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}