/* ============================================================
   categories.js — Expenso · Categories Page
   REST API driven · Chart.js sparklines · Modal system
   ============================================================ */
'use strict';
let LOAD_SEQ = 0;

/* ── helpers ── */
const $  = id => document.getElementById(id);
const fmt = n  => n != null ? '₹' + Math.round(n).toLocaleString('en-IN') : '₹0';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ── State ── */
let CATS      = [];   // categories from API
let RULES     = [];   // auto-tag rules (localStorage for now)
let editMode  = false;
let editId    = null;
let deleteId  = null;
let viewMode  = 'grid'; // 'grid' | 'table'
let sparkCharts = {};

/* ── Toast ── */
function showToast(msg, duration = 3000) {
  const t = $('navToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

/* ════════════════════════════════════════════════════════════
   API CALLS
════════════════════════════════════════════════════════════ */
async function apiFetch(url, opts = {}) {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRFToken': csrf,
      ...(opts.headers || {})
    },
  });

  if (!res.ok) {
    let err = {};
    try {
      err = await res.json();
    } catch {}
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

async function loadCategories() {
  const seq = ++LOAD_SEQ;

  try {
    const data = await apiFetch('/api/categories');

    // ignore stale responses
    if (seq !== LOAD_SEQ) return;

    CATS = data.categories || [];

    updateSummaryStrip();
    renderGrid();
    renderTable();

  } catch (e) {
    if (seq !== LOAD_SEQ) return;
    console.error('[Expenso Categories]', e);
    showToast('Could not load categories. Please refresh.', 5000);
  }
}

/* ════════════════════════════════════════════════════════════
   SUMMARY STRIP
════════════════════════════════════════════════════════════ */
function updateSummaryStrip() {
  let totalBudget = 0, totalSpent = 0, overCount = 0;
  CATS.forEach(c => {
    if (c.budget) totalBudget += c.budget;
    totalSpent += (c.spent_month || 0);
    if (c.budget && c.spent_month > c.budget) overCount++;
  });

  const remaining = totalBudget - totalSpent;
  const rulesCount = RULES.length;

  $('ssTotalBudget').textContent = fmt(totalBudget);
  $('ssSpentMonth').textContent  = fmt(totalSpent);
  $('ssRemaining').textContent   = fmt(remaining);
  $('ssOverBudget').textContent  = overCount;
  $('ssRulesCount').innerHTML    = `${rulesCount} <span class="ct-ss-unit">active</span>`;

  $('ssRemaining').style.color   = remaining >= 0 ? 'var(--teal)' : 'var(--rose)';
}

/* ════════════════════════════════════════════════════════════
   STATUS + WHEEL HELPERS
════════════════════════════════════════════════════════════ */
function getStatus(cat) {
  if (!cat.budget) return { label: 'No budget', cls: 'ct-badge--no-budget' };
  const pct = (cat.spent_month / cat.budget) * 100;
  if (pct >= 100) return { label: 'Over budget', cls: 'ct-badge--over' };
  if (pct >= 80)  return { label: 'At risk',     cls: 'ct-badge--at-risk' };
  return { label: 'On track', cls: 'ct-badge--on-track' };
}

function wheelColor(pct) {
  if (pct >= 100) return 'var(--rose)';
  if (pct >= 80)  return '#f59e0b';
  return 'var(--teal)';
}

/* circumference of r=30 circle = 188.5 */
const CIRC = 188.5;
function pctToOffset(pct) {
  return CIRC - clamp(pct / 100, 0, 1) * CIRC;
}

/* ════════════════════════════════════════════════════════════
   GRID VIEW
════════════════════════════════════════════════════════════ */
function renderGrid() {
  const grid = $('catGrid');
  // destroy old sparkline charts
  Object.values(sparkCharts).forEach(c => c.destroy());
  sparkCharts = {};

  // Clear skeleton / old cards
  grid.innerHTML = '';

  CATS.forEach((cat, idx) => {
    const status   = getStatus(cat);
    const pct      = cat.budget ? clamp((cat.spent_month / cat.budget) * 100, 0, 110) : 0;
    const color    = cat.color || 'var(--accent)';
    const remaining = cat.budget ? (cat.budget - (cat.spent_month || 0)) : null;
    const wColor    = wheelColor(pct);

    const card = document.createElement('div');
    card.className = 'ct-card';
    card.style.setProperty('--ct-cat-color', color);
    card.style.animationDelay = `${idx * 0.04}s`;
    card.innerHTML = `
      <!-- Top row -->
      <div class="ct-card-top">
        <div class="ct-card-left">
          <div class="ct-card-icon">${cat.icon || '🏷️'}</div>
          <div>
            <div class="ct-card-name">${escHtml(cat.name)}</div>
            ${cat.is_default ? '<div class="ct-card-default">Default</div>' : ''}
          </div>
        </div>
        <span class="ct-badge ${status.cls}">${status.label}</span>
      </div>

      <!-- Pacing wheel + stats -->
      <div class="ct-wheel-row">
        <div class="ct-wheel-wrap">
          <svg class="ct-wheel" viewBox="0 0 80 80">
            <circle class="ct-wheel-track" cx="40" cy="40" r="30"/>
            <circle class="ct-wheel-fill" cx="40" cy="40" r="30"
              stroke="${wColor}"
              stroke-dashoffset="${pctToOffset(pct)}"
              id="arc-${cat.id}"/>
          </svg>
          <span class="ct-wheel-pct">${Math.round(pct)}%</span>
        </div>
        <div class="ct-wheel-stats">
          <div class="ct-wheel-spent">${fmt(cat.spent_month)}</div>
          <div class="ct-wheel-budget">${cat.budget ? 'of ' + fmt(cat.budget) : 'No budget set'}</div>
          ${remaining !== null
            ? `<div class="ct-wheel-remaining" style="color:${remaining >= 0 ? 'var(--teal)' : 'var(--rose)'}">
                ${remaining >= 0 ? fmt(remaining) + ' left' : fmt(Math.abs(remaining)) + ' over'}
               </div>`
            : ''}
        </div>
      </div>

      <!-- Sparkline -->
      <div class="ct-sparkline-wrap">
        <div class="ct-sparkline-label">Last 6 months</div>
        <div class="ct-sparkline" id="spark-${cat.id}"></div>
      </div>

      <!-- Footer -->
      <div class="ct-card-footer">
        <span class="ct-rollover-tag ${cat.rollover ? 'active' : ''}">
          ${cat.rollover
            ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> Rollover on'
            : 'Rollover off'}
        </span>
        <div class="ct-card-actions">
          <button class="ct-action-btn ct-action-btn--edit"
            onclick="openEdit(${cat.id})" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </button>
          <button class="ct-action-btn ct-action-btn--delete"
            onclick="openDelete(${cat.id})" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
    buildSparkline(cat);
  });

  // "Add" card
  const addCard = document.createElement('div');
  addCard.className = 'ct-card ct-card--add';
  addCard.innerHTML = `
    <div class="ct-add-icon">+</div>
    <span class="ct-add-label">New Category</span>
  `;
  addCard.addEventListener('click', openCreate);
  grid.appendChild(addCard);
}

/* ── Sparkline via inline bars ── */
function buildSparkline(cat) {
  const wrap = $(`spark-${cat.id}`);
  if (!wrap) return;

  const history = cat.monthly_history || [0, 0, 0, 0, 0, cat.spent_month || 0];
  const max = Math.max(...history, 1);

  history.forEach((val, idx) => {
    const bar = document.createElement('div');
    bar.className = `ct-spark-bar${idx === history.length - 1 ? ' current' : ''}`;
    bar.style.height = `${clamp((val / max) * 100, 4, 100)}%`;
    bar.style.background = cat.color || 'var(--accent)';
    bar.title = fmt(val);
    wrap.appendChild(bar);
  });
}

/* ════════════════════════════════════════════════════════════
   TABLE VIEW
════════════════════════════════════════════════════════════ */
function renderTable() {
  const body = $('catTableBody');
  if (!body) return;
  body.innerHTML = '';

  CATS.forEach(cat => {
    const status    = getStatus(cat);
    const remaining = cat.budget ? (cat.budget - (cat.spent_month || 0)) : null;

    const row = document.createElement('div');
    row.className = 'ct-table-row';
    row.innerHTML = `
      <div class="ct-tr-cat">
        <div class="ct-tr-icon">${escHtml(cat.icon || '🏷️')}</div>
        <span class="ct-tr-name">${escHtml(cat.name)}</span>
      </div>
      <div class="ct-tr-amt ct-tr-budget">${cat.budget ? fmt(cat.budget) : '—'}</div>
      <div class="ct-tr-amt ct-tr-spent">${fmt(cat.spent_month)}</div>
      <div class="ct-tr-remaining ${remaining != null ? (remaining >= 0 ? 'positive' : 'negative') : ''}">
        ${remaining != null ? fmt(Math.abs(remaining)) + (remaining < 0 ? ' over' : ' left') : '—'}
      </div>
      <div><span class="ct-badge ${status.cls}">${status.label}</span></div>
      <div class="ct-tr-rollover">
        <label class="ct-mini-toggle">
          <input type="checkbox" ${cat.rollover ? 'checked' : ''} onchange="toggleRollover(${cat.id}, this.checked)">
          <span class="ct-mini-track"><span class="ct-mini-thumb"></span></span>
        </label>
      </div>
      <div class="ct-tr-actions">
        <button class="ct-action-btn ct-action-btn--edit" onclick="openEdit(${cat.id})" title="Edit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
          </svg>
        </button>
        <button class="ct-action-btn ct-action-btn--delete" onclick="openDelete(${cat.id})" title="Delete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;
    body.appendChild(row);
  });
}

/* ════════════════════════════════════════════════════════════
   VIEW TOGGLE
════════════════════════════════════════════════════════════ */
function initViewToggle() {
  $('viewGrid').addEventListener('click', () => {
    viewMode = 'grid';
    $('viewGrid').classList.add('active');
    $('viewTable').classList.remove('active');
    $('catGrid').hidden  = false;
    $('catTable').hidden = true;
  });
  $('viewTable').addEventListener('click', () => {
    viewMode = 'table';
    $('viewTable').classList.add('active');
    $('viewGrid').classList.remove('active');
    $('catGrid').hidden  = true;
    $('catTable').hidden = false;
  });
}

/* ════════════════════════════════════════════════════════════
   CREATE / EDIT MODAL
════════════════════════════════════════════════════════════ */
function openCreate() {
  editMode = false; editId = null;
  $('createModalTitle').textContent = 'New Category';
  $('createBtnText').textContent    = 'Create category';
  $('editCatId').value              = '';
  resetCreateForm();
  $('createModal').hidden = false;
  document.body.style.overflow = 'hidden';
  $('catName').focus();
}

function openEdit(id) {
  const cat = CATS.find(c => Number(c.id) === Number(id));
  if (!cat) return;
  editMode = true; editId = id;

  $('createModalTitle').textContent = 'Edit Category';
  $('createBtnText').textContent    = 'Save changes';
  $('editCatId').value              = id;
  $('catName').value                = cat.name;
  $('catBudget').value              = cat.budget || '';
  $('catRollover').checked          = !!cat.rollover;

  // Select emoji
  document.querySelectorAll('.ct-emoji-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.emoji === cat.icon);
  });

  updatePreview();
  $('createModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeCreateModal() {
  $('createModal').hidden = true;
  document.body.style.overflow = '';
  clearCreateErrors();
}

function resetCreateForm() {
  $('catName').value      = '';
  $('catBudget').value    = '';
  $('catRollover').checked = false;
  document.querySelectorAll('.ct-emoji-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  $('customEmojiInput').hidden = true;
  $('budgetSuggest').textContent = '';
  updatePreview();
  clearCreateErrors();
}

function clearCreateErrors() {
  $('catNameError').textContent   = '';
  $('catBudgetError').textContent = '';
  $('createErrorBanner').hidden   = true;
}

/* ── Live preview update ── */
function updatePreview() {
  const name   = $('catName').value.trim() || 'Category Name';
  const budget = parseFloat($('catBudget').value) || 0;
  const emoji  = document.querySelector('.ct-emoji-btn.active')?.dataset.emoji || '🏷️';

  $('previewName').textContent  = name;
  $('previewIcon').textContent  = emoji;
  $('previewSpent').textContent = '₹0 spent';
  $('previewLimit').textContent = budget ? `of ${fmt(budget)}` : 'no budget';
  $('previewPct').textContent   = '0%';

  // Reset arc
  const arc = $('previewArc');
  if (arc) arc.setAttribute('stroke-dashoffset', '188.5');
}

/* ── Emoji selection ── */
function initEmojiPicker() {
  document.querySelectorAll('.ct-emoji-btn').forEach(btn => {
    if (btn.id === 'customEmojiBtn') return;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ct-emoji-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $('customEmojiInput').hidden = true;
      updatePreview();
    });
  });

  $('customEmojiBtn').addEventListener('click', () => {
    $('customEmojiInput').hidden = false;
    $('customEmojiInput').focus();
  });

  $('customEmojiInput').addEventListener('input', e => {
    const val = e.target.value.trim();
    if (!val) return;
    // Use first emoji character
    const first = [...val][0] || val;
    document.querySelectorAll('.ct-emoji-btn').forEach(b => b.classList.remove('active'));
    $('customEmojiBtn').textContent = first;
    $('customEmojiBtn').dataset.emoji = first;
    $('customEmojiBtn').classList.add('active');
    updatePreview();
  });
}

/* ── Validation ── */
function validateCreate() {
  let valid = true;
  clearCreateErrors();

  const name = $('catName').value.trim();
  if (!name) {
    $('catNameError').textContent = 'Name is required.';
    valid = false;
  }

  const budget = $('catBudget').value;
  if (budget && (isNaN(budget) || parseFloat(budget) < 0)) {
    $('catBudgetError').textContent = 'Enter a valid amount.';
    valid = false;
  }

  return valid;
}

/* ── Save ── */
async function saveCategory() {
  if (!validateCreate()) return;

  const payload = {
    name:     $('catName').value.trim(),
    icon:     document.querySelector('.ct-emoji-btn.active')?.dataset.emoji || '🏷️',
    color:    '#14b8a6',   // ← default for now, add color picker later
    budget:   parseFloat($('catBudget').value) || null,
    rollover: $('catRollover').checked,
  };

  const loader  = $('createBtnLoader');
  const btnText = $('createBtnText');
  btnText.hidden  = true;
  loader.hidden   = false;

  try {
    if (editMode && editId) {
      await apiFetch(`/api/categories/${editId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast(`✓ "${payload.name}" updated`);
    } else {
      await apiFetch('/api/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast(`✓ "${payload.name}" created`);
    }
    closeCreateModal();
    await loadCategories();
  } catch (err) {
    $('createErrorText').textContent = err.message;
    $('createErrorBanner').hidden    = false;
  } finally {
    btnText.hidden  = false;
    loader.hidden   = true;
  }
}

/* ════════════════════════════════════════════════════════════
   DELETE MODAL
════════════════════════════════════════════════════════════ */
function openDelete(id) {
  const cat = CATS.find(c => Number(c.id) === Number(id));
  if (!cat) return;
  deleteId = id;

  // Populate merge dropdown (all other cats)
  const txCount  = cat.tx_count || 0;

const sel = $('mergeTarget');

if (txCount > 0) {
  // show dropdown only when needed
  sel.innerHTML = `
    <option value="">📦 Uncategorized</option>
    ${CATS
      .filter(c => Number(c.id) !== Number(id))
      .map(c => `<option value="${c.id}">${c.icon} ${escHtml(c.name)}</option>`)
      .join('')}
    `;
    sel.parentElement.style.display = 'block';
  } else {
    // hide dropdown completely
    sel.innerHTML = '';
    sel.parentElement.style.display = 'none';
  }

  // const txCount  = cat.tx_count  || 0;
  const txAmount = cat.tx_amount || 0;

  $('deleteSub').innerHTML = txCount > 0
    ? `<strong>${txCount}</strong> transaction${txCount !== 1 ? 's' : ''} totaling <strong id="deleteTotalAmt">${fmt(txAmount)}</strong> will be reassigned.`
    : 'This category has no transactions. It will be permanently deleted.';

  $('deleteModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
  $('deleteModal').hidden = true;
  document.body.style.overflow = '';
  deleteId = null;
}

async function confirmDelete() {
  if (!deleteId) return;
  const targetId = $('mergeTarget').value;

  try {
    await apiFetch(`/api/categories/${deleteId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reassign_to: targetId }),
    });
    const cat = CATS.find(c => Number(c.id) === Number(deleteId));
    showToast(`🗑️ "${cat?.name}" deleted & transactions moved`);
    closeDeleteModal();
    await loadCategories();
  } catch (err) {
    showToast(`Error: ${err.message}`, 4000);
  }
}

/* ════════════════════════════════════════════════════════════
   ROLLOVER TOGGLE (table view)
════════════════════════════════════════════════════════════ */
async function toggleRollover(id, value) {
  try {
    await apiFetch(`/api/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ rollover: value }),
    });
    const cat = CATS.find(c => Number(c.id) === Number(id));
    if (cat) cat.rollover = value;
    showToast(value ? '↻ Rollover enabled' : 'Rollover disabled');
    // Refresh grid silently
    renderGrid();
  } catch (err) {
    showToast(`Error: ${err.message}`, 4000);
  }
}

// expose globally for inline onclick
window.openEdit    = openEdit;
window.openDelete  = openDelete;
window.toggleRollover = toggleRollover;

/* ════════════════════════════════════════════════════════════
   AUTO-TAG RULES  (localStorage until backend built)
════════════════════════════════════════════════════════════ */
function loadRules() {
  try {
    RULES = JSON.parse(localStorage.getItem('expenso_rules') || '[]');
  } catch { RULES = []; }
  renderRules();
  updateSummaryStrip();
}

function saveRulesLocal() {
  localStorage.setItem('expenso_rules', JSON.stringify(RULES));
}

function renderRules() {
  const list = $('rulesList');
  list.innerHTML = '';

  if (!RULES.length) {
    list.innerHTML = `<div class="ct-rules-empty">
      No rules yet. Add one to automatically categorise your expenses! 🤖
    </div>`;
    return;
  }

  RULES.forEach((rule, idx) => {
    const cat = CATS.find(c => Number(c.id) === rule.catId);
    const item = document.createElement('div');
    item.className = 'ct-rule-item';
    item.style.animationDelay = `${idx * 0.04}s`;

    const condition = rule.keyword
      ? `title contains <em>"${escHtml(rule.keyword)}"</em>`
      : `amount is exactly <em>${fmt(rule.amount)}</em>`;

    item.innerHTML = `
      <div class="ct-rule-icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
        </svg>
      </div>
      <div class="ct-rule-text">
        <div class="ct-rule-condition">If ${condition}</div>
        <div class="ct-rule-target">→ assign to <span>${cat ? cat.icon + ' ' + escHtml(cat.name) : 'Unknown'}</span></div>
      </div>
      <button class="ct-rule-delete" onclick="deleteRule(${idx})">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
        </svg>
      </button>
    `;
    list.appendChild(item);
  });
}

function deleteRule(idx) {
  RULES.splice(idx, 1);
  saveRulesLocal();
  renderRules();
  updateSummaryStrip();
  showToast('Rule removed');
}
window.deleteRule = deleteRule;

/* Rule modal */
function openRuleModal() {
  // Populate cat dropdown
  const sel = $('ruleCatTarget');
  sel.innerHTML = CATS.map(c => `<option value="${c.id}">${c.icon} ${escHtml(c.name)}</option>`).join('');
  $('ruleKeyword').value = '';
  $('ruleAmount').value  = '';
  $('ruleModal').hidden  = false;
  document.body.style.overflow = 'hidden';
}

function closeRuleModal() {
  $('ruleModal').hidden = true;
  document.body.style.overflow = '';
}

function saveRule() {
  const keyword = $('ruleKeyword').value.trim();
  const amount  = parseFloat($('ruleAmount').value) || null;
  const catId   = parseInt($('ruleCatTarget').value);

  if (!keyword && !amount) {
    showToast('Add a keyword or amount for the rule.', 3000);
    return;
  }

  RULES.push({ keyword: keyword || null, amount: amount || null, catId });
  saveRulesLocal();
  renderRules();
  updateSummaryStrip();
  closeRuleModal();
  showToast('✓ Auto-tag rule added');
}

/* ════════════════════════════════════════════════════════════
   MOBILE SIDEBAR
════════════════════════════════════════════════════════════ */
function initSidebar() {
  const sidebar   = $('sidebar');
  const overlay   = $('sidebarOverlay');
  const hamburger = $('hamburgerBtn');

  if (!sidebar || !overlay || !hamburger) return;

  const open  = () => { sidebar.classList.add('open');    overlay.classList.add('active');    document.body.style.overflow = 'hidden'; };
  const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; };

  hamburger.addEventListener('click', open);
  overlay.addEventListener('click', close);
  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', () => { if (window.innerWidth <= 900) close(); });
  });
}

/* ════════════════════════════════════════════════════════════
   BUDGET SUGGESTION  (avg of last 3 months from history)
════════════════════════════════════════════════════════════ */
function suggestBudget() {
  const name = $('catName').value.trim().toLowerCase();
  if (!name) { $('budgetSuggest').textContent = ''; return; }

  const cat = CATS.find(c => c.name.toLowerCase() === name);
  if (!cat?.monthly_history?.length) { $('budgetSuggest').textContent = ''; return; }

  const last3 = cat.monthly_history.slice(-3);
  const avg   = last3.reduce((s, v) => s + v, 0) / last3.length;
  if (avg > 0) {
    $('budgetSuggest').textContent = `Suggested based on your 3-month average: ${fmt(avg)}`;
  }
}

/* ════════════════════════════════════════════════════════════
   ESCAPE HTML
════════════════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initViewToggle();
  initEmojiPicker();

  // Modal wiring — create
  $('openCreateModal').addEventListener('click', openCreate);
  $('createModalClose').addEventListener('click', closeCreateModal);
  $('createModalCancel').addEventListener('click', closeCreateModal);
  $('createModalSave').addEventListener('click', saveCategory);

  // Live preview bindings
  $('catName').addEventListener('input', () => { updatePreview(); suggestBudget(); });
  $('catBudget').addEventListener('input', updatePreview);

  // Modal wiring — delete
  $('deleteModalCancel').addEventListener('click', closeDeleteModal);
  $('deleteModalConfirm').addEventListener('click', confirmDelete);

  // Modal wiring — rules
  // $('openRuleModal').addEventListener('click', openRuleModal); Uncomment it when that Auto-Detect Feature Needed
  $('ruleModalClose').addEventListener('click', closeRuleModal);
  $('ruleModalCancel').addEventListener('click', closeRuleModal);
  $('ruleModalSave').addEventListener('click', saveRule);

  // Close modals on backdrop click
  ['createModal', 'deleteModal', 'ruleModal'].forEach(id => {
    $(id).addEventListener('click', e => {
      if (e.target === $(id)) {
        $(id).hidden = true;
        document.body.style.overflow = '';
      }
    });
  });

  // Keyboard: Esc closes topmost modal
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    for (const id of ['ruleModal', 'deleteModal', 'createModal']) {
      const el = $(id);
      if (el && !el.hidden) {
        el.hidden = true;
        document.body.style.overflow = '';
        break;
      }
    }
  });

  // Load data
  loadCategories();
  loadRules();
});