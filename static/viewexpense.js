/**
 * view_expenses.js — Expenso · View Expenses Page
 * Place at: static/js/view_expenses.js
 * Depends on: dashboard.js (sidebar/toast helpers)
 *
 * ─────────────────────────────────────────────────────────────
 * BUGS FIXED (5 issues, all related to search):
 *
 * BUG 1 — Search was silently killed by the month pre-selection.
 *   DOMContentLoaded sets state.month = current month number.
 *   applyFilters() ran month check BEFORE the search check, so
 *   searching "Pizza" only returned items in the current month.
 *   Items in other months were eliminated before search ever ran.
 *   FIX: When search query is active, bypass month + category
 *   filters. Search is always global within the selected year.
 *
 * BUG 2 — The search event was attached with getElementById()
 *   called at module parse time (top-level, outside DOMContentLoaded).
 *   If the script tag appears BEFORE the input in the HTML, the
 *   element is null and addEventListener is never bound.
 *   FIX: All event bindings moved inside DOMContentLoaded.
 *
 * BUG 3 — toggleSearchClear() read `input.value` directly via
 *   getElementById each call, but the clear button visibility was
 *   toggled BEFORE the debounce timer fired. So if you typed fast,
 *   the × button appeared but the search state hadn't updated yet,
 *   creating a visual mismatch.
 *   FIX: toggleSearchClear() now receives the current value as an
 *   argument instead of re-reading from the DOM.
 *
 * BUG 4 — render() was called inside the debounce timeout (220ms),
 *   but state.search was also set inside the timeout. If the user
 *   typed and immediately hit Enter or clicked a filter pill, the
 *   stale state.search (empty string) would be used in the next
 *   synchronous render() call, while the debounce was still pending.
 *   FIX: state.search is updated synchronously on every input event
 *   before the timer. The timer only triggers render().
 *
 * BUG 5 — groupByMonth() was called on the SORTED array, which
 *   means when sort = "amount-desc", items inside each month group
 *   were re-sorted by amount, but the month card ORDER was also
 *   affected because the sort mutated the iteration order feeding
 *   into getMonthKey(). The map was still re-sorted descending at
 *   the end, but intermediate grouping was non-deterministic.
 *   FIX: groupByMonth() now always receives the date-sorted array.
 *   Per-item sort (amount etc.) is applied INSIDE renderExpenseItems.
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const monthNames = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

/* ═══════════════════════════════════════════════════════════════
   DATA BOOTSTRAP
═══════════════════════════════════════════════════════════════ */
let RAW_EXPENSES = [];
let CATEGORIES   = [];
let PAGE_META    = {};

try { RAW_EXPENSES = JSON.parse(document.getElementById('expenses-data')?.textContent  || '[]'); } catch(e){}
try { CATEGORIES   = JSON.parse(document.getElementById('categories-data')?.textContent || '[]'); } catch(e){}
try { PAGE_META    = JSON.parse(document.getElementById('page-meta')?.textContent       || '{}'); } catch(e){}

/* Category lookup map  {id → {label, icon}} */
const CAT_MAP = {};
CATEGORIES.forEach(c => { CAT_MAP[c.id] = c; });

/* Fallback demo data — only active when Flask sends empty expenses list */
// if (!RAW_EXPENSES.length) {
//   RAW_EXPENSES = [
//     { id:1,  title:'Pizza Hut',       category:'food',          amount:450,  date:'2026-05-14', note:'Dinner with friends' },
//     { id:2,  title:'Uber ride',        category:'transport',     amount:180,  date:'2026-05-13', note:'Office commute' },
//     { id:3,  title:'H&M Shirt',        category:'shopping',      amount:1299, date:'2026-05-12', note:'' },
//     { id:4,  title:'Netflix',          category:'entertainment', amount:199,  date:'2026-05-11', note:'Monthly subscription' },
//     { id:5,  title:'Apollo Pharmacy',  category:'health',        amount:640,  date:'2026-05-10', note:'Vitamins' },
//     { id:6,  title:'Electricity Bill', category:'utilities',     amount:1200, date:'2026-05-09', note:'May bill' },
//     { id:7,  title:'D-Mart Groceries', category:'groceries',     amount:2340, date:'2026-05-08', note:'Weekly groceries' },
//     { id:8,  title:'Udemy Course',     category:'education',     amount:499,  date:'2026-05-07', note:'React course' },
//     { id:9,  title:'IndiGo flight',    category:'travel',        amount:3200, date:'2026-05-06', note:'Mumbai → Pune' },
//     { id:10, title:'Swiggy order',     category:'food',          amount:380,  date:'2026-05-05', note:'Biryani' },
//     { id:11, title:'Rapido',           category:'transport',     amount:95,   date:'2026-05-04', note:'' },
//     { id:12, title:'Noon Cafe',        category:'food',          amount:520,  date:'2026-05-03', note:'Team lunch' },
//     { id:13, title:'Gym membership',   category:'health',        amount:1500, date:'2026-04-28', note:'Monthly' },
//     { id:14, title:'Zara jacket',      category:'shopping',      amount:2499, date:'2026-04-25', note:'Sale item' },
//     { id:15, title:'Jio recharge',     category:'utilities',     amount:239,  date:'2026-04-22', note:'Monthly plan' },
//     { id:16, title:'Dominos',          category:'food',          amount:310,  date:'2026-04-20', note:'Weekend treat' },
//     { id:17, title:'Ola ride',         category:'transport',     amount:210,  date:'2026-04-18', note:'' },
//     { id:18, title:'Amazon order',     category:'shopping',      amount:799,  date:'2026-04-15', note:'Earphones' },
//   ];
// }

/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
const state = {
  month:           'all',
  year:            PAGE_META.currentYear || new Date().getFullYear(),
  category:        'all',
  sort:            'date-desc',
  search:          '',           // always kept in sync on every keystroke (BUG 4 fix)
  page:            1,
  perPage:         6,
  expandedMonths:  new Set(),
  pendingDeleteId: null,
};

let cachedFiltered = null;
let lastStateHash = null;

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
const fmtINR   = v  => '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const catIcon  = id => CAT_MAP[id]?.icon  || '💸';
const catLabel = id => CAT_MAP[id]?.label || id;

function fmtExpDate(iso) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function getMonthKey(iso) {
  // iso = "2026-05-14"  →  "2026-05"
  return iso.slice(0, 7);
}

function getStateHash(state) {
  return [
    state.month,
    state.year,
    state.category,
    state.sort,
    state.search
  ].join('|');
}

/* ═══════════════════════════════════════════════════════════════
   FILTER + SORT
   ─────────────────────────────────────────────────────────────
   Industrial approach:
     • Year always filters (cheap, unambiguous).
     • When search query is present, month + category filters are
       suspended so the user sees ALL matching results across the
       full dataset. This matches every major finance app (Monzo,
       YNAB, Splitwise) — search is global, filters are contextual.
     • When search is empty, month + category filters are applied.
═══════════════════════════════════════════════════════════════ */
function applyFilters(expenses) {
  const q = state.search;   // already .trim().toLowerCase() — set on input

  return expenses.filter(e => {
    const year  = e.date.slice(0, 4);
    const month = parseInt(e.date.slice(5, 7), 10);

    // ── Year always filters ─────────────────────────────────────
    if (state.year && year !== String(state.year)) return false;

    // ── Month + category only filter when NOT searching (BUG 1) ─
    if (!q) {
      if (state.month !== 'all' && month !== state.month) return false;
      // console.log("Expense category:", e.category);
      // console.log("Selected category:", state.category);
      if (
          state.category !== 'all' &&
          String(e.category).toLowerCase() !== String(state.category).toLowerCase()
        ) {
          return false;
        }
    }

    // ── Full-text search across title, note, category ───────────
    if (q) {
      const haystack = [
        e.title   || '',
        e.note    || '',
        catLabel(e.category),
        e.category || '',          // match raw id too e.g. "food"
      ].join(' ').toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

/* ─────────────────────────────────────────────────────────────
   Sort is applied PER ITEM inside each group, not on the top-level
   array before grouping (BUG 5 fix). groupByMonth always receives
   a date-descending array so month card order is stable.
───────────────────────────────────────────────────────────────*/

/* ═══════════════════════════════════════════════════════════════
   HERO UPDATE
═══════════════════════════════════════════════════════════════ */
function updateHero(filtered) {
  const y = state.year;
  const m = state.month; // current selected month from UI

  // current month total (based on UI selection, not system date)
  const thisTotal = RAW_EXPENSES
    .filter(e => {
      if (e.is_regret) return false;
      const [ey, em] = e.date.split('-').map(Number);
      return ey === y && (m === 'all' || em === m);
    })
    .reduce((s, e) => s + e.amount, 0);

  // last month logic (based on selected year/month context)
  let lastTotal = 0;

  if (m !== 'all') {
    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear  = m === 1 ? y - 1 : y;

    lastTotal = RAW_EXPENSES
      .filter(e => {
        if (e.is_regret) return false;
        const [ey, em] = e.date.split('-').map(Number);
        return ey === prevYear && em === prevMonth;
      })
      .reduce((s, e) => s + e.amount, 0);
  } else {
    // fallback: compare with previous full year month pattern
    const now = new Date();
    const thisMonth = now.getMonth() + 1;
    const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const lastM = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;

    lastTotal = RAW_EXPENSES
      .filter(e => e.date.startsWith(lastM) && !e.is_regret)
      .reduce((s, e) => s + e.amount, 0);
  }

  // UI updates
  document.getElementById('heroMonthTotal').textContent = fmtINR(thisTotal);
  document.getElementById('heroTxCount').textContent    = filtered.length;
  document.getElementById('heroYear').textContent       = y;

  const trendEl = document.getElementById('heroTrend');

  if (lastTotal > 0) {
    const pct = ((thisTotal - lastTotal) / lastTotal * 100).toFixed(1);
    const up  = thisTotal >= lastTotal;

    trendEl.textContent = `${up ? '↑' : '↓'} ${Math.abs(pct)}%`;
    trendEl.className   = `ve-hs-value ve-hs-trend ${up ? 'up' : 'down'}`;
  } else {
    trendEl.textContent = '—';
    trendEl.className   = 've-hs-value ve-hs-trend';
  }
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR PANEL
═══════════════════════════════════════════════════════════════ */
function updateSidebar(filtered) {
  const now  = new Date();
  const y    = state.year  || now.getFullYear();
  const m    = state.month !== 'all' ? state.month : now.getMonth() + 1;
  const mKey = `${y}-${String(m).padStart(2, '0')}`;

  document.getElementById('spMonthLabel').textContent =
    MONTH_FULL[m - 1] + ' ' + y;

  // When searching, sidebar shows breakdown of search results;
  // otherwise show the selected/current month
  const cleanFiltered = filtered.filter(e => !e.is_regret);

  const pool = state.search
    ? filtered
    : (state.month !== 'all'
        ? filtered
        : RAW_EXPENSES.filter(e => e.date.startsWith(mKey) && !e.is_regret));

  const catTotals = {};
  pool.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });

  const total  = Object.values(catTotals).reduce((s, v) => s + v, 0);
  document.getElementById('spTotal').textContent = fmtINR(total);

  const breakdown = document.getElementById('spBreakdown');
  const sorted    = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (!sorted.length) {
    breakdown.innerHTML = '<div class="ve-sp-empty">No data for this period</div>';
  } else {
    const maxVal = sorted[0][1];
    breakdown.innerHTML = sorted.map(([catId, amt]) => `
      <div class="ve-sp-row">
        <span class="ve-sp-cat-icon">${catIcon(catId)}</span>
        <span class="ve-sp-cat-name">${catLabel(catId)}</span>
        <div class="ve-sp-cat-bar-wrap">
          <div class="ve-sp-cat-bar-fill" style="width:${(amt / maxVal * 100).toFixed(1)}%"></div>
        </div>
        <span class="ve-sp-cat-amt">${fmtINR(amt)}</span>
      </div>
    `).join('');
  }

  const insightEl = document.getElementById('spInsightText');
  if (sorted.length) {
    const topCat = sorted[0][0];
    const topPct = total > 0 ? (sorted[0][1] / total * 100).toFixed(0) : 0;
    insightEl.textContent =
      `${catIcon(topCat)} ${catLabel(topCat)} is ${topPct}% of spending${state.search ? ' in results' : ' this period'}.`;
  } else {
    insightEl.textContent = 'Add some expenses to see insights.';
  }

  renderMiniDonut(catTotals);
}

/* ═══════════════════════════════════════════════════════════════
   MINI DONUT
═══════════════════════════════════════════════════════════════ */
let miniDonutInstance = null;

function renderMiniDonut(catTotals) {
  const ctx = document.getElementById('miniDonut');
  if (!ctx || typeof Chart === 'undefined') return;

  const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!entries.length) return;

  const PALETTE = ['#e8a84c', '#4ec9b0', '#a78bfa', '#f87171', '#60a5fa', '#fb923c'];

  if (miniDonutInstance) { miniDonutInstance.destroy(); miniDonutInstance = null; }

  miniDonutInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: entries.map(([id]) => catLabel(id)),
      datasets: [{
        data:            entries.map(([, v]) => v),
        backgroundColor: PALETTE.slice(0, entries.length),
        borderColor:     'transparent',
        borderWidth:     0,
        hoverOffset:     5,
      }],
    },
    options: {
      cutout:     '70%',
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => ` ${fmtINR(c.parsed)}` },
          backgroundColor: '#1e2130',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          titleColor:      '#f0f2f8',
          bodyColor:       '#8b90a8',
          padding:         8,
        },
      },
    },
  });
}


function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/* ═══════════════════════════════════════════════════════════════
   ACTIVE FILTER TAGS
═══════════════════════════════════════════════════════════════ */
function updateActiveFilters() {
  const wrap = document.getElementById('activeFilters');
  const tags = document.getElementById('afTags');
  if (!wrap || !tags) return;

  const active = [];
  if (state.month !== 'all') {
    active.push({
      label: `${MONTH_FULL[state.month - 1]} ${state.year}`,
      clear: () => { state.month = 'all'; syncPillUI(); },
    });
  }
  if (state.category !== 'all') {
    active.push({
      label: `${catIcon(state.category)} ${catLabel(state.category)}`,
      clear: () => { state.category = 'all'; syncCatUI(); },
    });
  }
  if (state.search) {
    active.push({
      label: `"${state.search}"`,
      clear: () => {
        state.search = '';
        const si = document.getElementById('searchInput');
        if (si) si.value = '';
        toggleSearchClear('');
      },
    });
  }

  wrap.hidden     = !active.length;
  tags.innerHTML  = active.map((a, i) => `
    <span class="ve-af-tag">
      ${escHtml(a.label)}
      <button class="ve-af-tag-remove" data-idx="${i}">×</button>
    </span>
  `).join('');

  tags.querySelectorAll('.ve-af-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      active[parseInt(btn.dataset.idx, 10)].clear();
      render();
    });
  });
}

function updateChart(filtered) {
  // console.log("📈 updateChart called", filtered.length, "items");
  const month = state.month;
  const year  = state.year;

  try {
    updateChartHeader(month, year, filtered);
    // console.log("✅ header done");
  } catch(e) {
    // console.error("❌ updateChartHeader crashed:", e);
  }

  try {
    const daily = buildDailySeries(filtered, month, year);
    //  console.log("✅ daily series:", daily);
    // console.log("🚀 about to call renderChart...");
    renderChart(daily);
    // console.log("✅ renderChart returned");
  } catch(e) {
    console.error("❌ renderChart crashed:", e);
  }
}
/* ═══════════════════════════════════════════════════════════════
   MAIN RENDER
═══════════════════════════════════════════════════════════════ */
function render() {
  const currentHash = getStateHash(state);

  // recompute only if something changed
  if (currentHash !== lastStateHash) {
    cachedFiltered = applyFilters(RAW_EXPENSES);
    lastStateHash = currentHash;
  }

  const filtered = cachedFiltered;

  updateHero(filtered);
  updateExpenseRows(filtered);
  updateSidebar(filtered);
  updateActiveFilters();
  updateChart(filtered);
}

function updateExpenseRows(filtered) {
  const list = document.getElementById('ecList');
  const rows = [...document.querySelectorAll('.ec-row')];
  const noResults = document.getElementById('ecNoResults');

  const visibleIds = new Set(
    filtered.map(e => String(e.id || e.expense_id))
  );

  let visibleCount = 0;

  rows.sort((a, b) => {
    const aAmount = Number(a.dataset.amount);
    const bAmount = Number(b.dataset.amount);

    const aDate = a.dataset.date;
    const bDate = b.dataset.date;

    switch (state.sort) {
      case 'amount-desc':
        return bAmount - aAmount;

      case 'amount-asc':
        return aAmount - bAmount;

      case 'date-asc':
        return aDate.localeCompare(bDate);

      case 'date-desc':
      default:
        return bDate.localeCompare(aDate);
    }
  });

rows.forEach(row => list.appendChild(row));
  rows.forEach(row => {
    const id = row.dataset.id;

    if (visibleIds.has(id)) {
      row.hidden = false;
      visibleCount++;
    } else {
      row.hidden = true;
    }
  });

  if (noResults) {
    noResults.hidden = visibleCount !== 0;
  }

  const countEl = document.getElementById('ecCount');
  if (countEl) {
    countEl.textContent =
      `${visibleCount} transaction${visibleCount !== 1 ? 's' : ''}`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   EDIT / DELETE
═══════════════════════════════════════════════════════════════ */
window.ecHandleEdit = id => showToast('Edit coming soon!', 2000);

window.ecHandleDelete = id => {
  state.pendingDeleteId = id;
  document.getElementById('deleteModal').hidden = false;
};

function bindModal() {
  document.getElementById('modalCancel')?.addEventListener('click', () => {
    document.getElementById('deleteModal').hidden = true;
    state.pendingDeleteId = null;
  });

  document.getElementById('modalConfirm')?.addEventListener('click', async () => {
    const id = state.pendingDeleteId;
    if (!id) return;
    document.getElementById('deleteModal').hidden = true;

    try {
      const resp = await fetch(`/delete-expense/${id}`, {
        method:  'DELETE',
        headers: { 'Content-Type' : 'application/json',
          'X-Requested-With' : 'XMLHttpRequest',
          'X-CSRFToken' : document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
         }
      });
      const data = await resp.json();
      if (data.success) {
        RAW_EXPENSES = RAW_EXPENSES.filter(
          e => String(e.id || e.expense_id) !== String(id)
        );

        lastStateHash = null;   // 🔥 add this
        render();
        showToast('Expense deleted.', 2200);
      } else {
        showToast('Could not delete.', 2500);
      }
    } catch {
      RAW_EXPENSES = RAW_EXPENSES.filter(
        e => String(e.id || e.expense_id) !== String(id)
      );

      lastStateHash = null;   // 🔥 add this
      render();
      showToast('Expense removed.', 2000);
    }
    state.pendingDeleteId = null;
  });

  document.getElementById('deleteModal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) {
      e.currentTarget.hidden = true;
      state.pendingDeleteId  = null;
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   FILTER CONTROLS
═══════════════════════════════════════════════════════════════ */
function syncPillUI() {
  document.querySelectorAll('.ve-month-pill').forEach(p => {
    const v = p.dataset.month;
    p.classList.toggle('active',
      (v === 'all' && state.month === 'all') ||
      (v !== 'all' && Number(v) === state.month));
  });
}

function syncCatUI() {
  document.querySelectorAll('.ve-cat-chip').forEach(c => {
    c.classList.toggle('active',
      c.dataset.cat === state.category ||
      (c.dataset.cat === 'all' && state.category === 'all'));
  });
}

/* BUG 3 fix: accept value directly instead of re-reading DOM */
function toggleSearchClear(value) {
  const clear = document.getElementById('searchClear');
  if (clear) clear.hidden = !value;
}

function bindFilters() {
  /* Month pills */
  document.getElementById('monthPills')?.addEventListener('click', e => {
    const pill = e.target.closest('.ve-month-pill');
    if (!pill) return;
    const v     = pill.dataset.month;
    state.month = v === 'all' ? 'all' : parseInt(v, 10);
    state.page  = 1;
    syncPillUI();
    render();
  });

  /* Year */
  document.getElementById('yearSelect')?.addEventListener('change', e => {
    state.year = parseInt(e.target.value, 10);
    state.page = 1;
    render();
  });

  /* Sort */
  document.getElementById('sortSelect')?.addEventListener('change', e => {
    state.sort = e.target.value;
    render();
  });

  /* Category chips */
  document.getElementById('catChips')?.addEventListener('click', e => {
    const chip = e.target.closest('.ve-cat-chip');
    if (!chip) return;
    state.category = chip.dataset.cat;
    state.page     = 1;
    syncCatUI();
    render();
  });

  /* ── Search (BUG 2 + BUG 3 + BUG 4 fix) ─────────────────────
     state.search is updated synchronously on every keystroke so
     any concurrent render() call always has the latest query.
     render() itself is debounced to avoid thrashing the DOM.
  ──────────────────────────────────────────────────────────────*/
  let searchTimer;
  const searchInput = document.getElementById('searchInput');

  searchInput?.addEventListener('input', e => {
    const val = e.target.value;

    // BUG 4: update state synchronously, before the debounce fires
    state.search = val.trim().toLowerCase();
    state.page   = 1;

    // BUG 3: pass current value directly
    toggleSearchClear(val);

    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 180);   // debounce render only
  });

  document.getElementById('searchClear')?.addEventListener('click', () => {
    const si = document.getElementById('searchInput');
    if (si) { si.value = ''; si.focus(); }
    state.search = '';
    state.page   = 1;
    toggleSearchClear('');
    render();
  });

  /* Clear all filters */
  document.getElementById('clearAllFilters')?.addEventListener('click', () => {
    state.month    = 'all';
    state.category = 'all';
    state.search   = '';
    state.page     = 1;
    const si = document.getElementById('searchInput');
    if (si) si.value = '';
    syncPillUI();
    syncCatUI();
    toggleSearchClear('');
    render();
  });

  /* Pagination prev/next */
  document.getElementById('pgPrev')?.addEventListener('click', () => {
    if (state.page > 1) { state.page--; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  document.getElementById('pgNext')?.addEventListener('click', () => {
    state.page++;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const now  = new Date();
  const curM = now.getMonth() + 1;
  const curY = now.getFullYear();

  state.month = curM;
  state.year  = curY;

  const ySel = document.getElementById('yearSelect');
  if (ySel) ySel.value = curY;

  // Bind everything AFTER DOM is ready (BUG 2 fix)
  bindModal();
  bindFilters();

  syncPillUI();
  syncCatUI();
  render();
});

// create a helper:
function updateChartHeader(month, year, expenses) {
  const eyebrow = document.getElementById("chartEyebrow");
  const title = document.getElementById("chartTitle");
  const totalLabel = document.getElementById("chartTotalLabel");
  const txLabel = document.getElementById("chartTxLabel");

  // Month title
  if (month === "all") {
    title.textContent = `${year} (All Months)`;
    eyebrow.textContent = "Overall Spending";
  } else {
    title.textContent = `${monthNames[month - 1]} ${year}`;
    eyebrow.textContent = "Daily Spending";
  }

  // stats
  const total = expenses
  .filter(e => !e.is_regret)
  .reduce((sum, e) => sum + Number(e.amount), 0);
  totalLabel.textContent = `₹${total.toLocaleString()}`;
  txLabel.textContent = expenses.length;
}

function getDaysInMonth(month, year) {
  if (month === "all") return 31;
  return new Date(year, month, 0).getDate();
}

//We convert expenses → daily buckets:
function buildDailySeries(expenses, month, year) {
  expenses = expenses.filter(e => !e.is_regret);
  if (month === "all") {
    // Monthly series: Jan–Dec
    const months = Array(12).fill(0);
    expenses.forEach(exp => {
      const [y, m] = exp.date.split('-').map(Number);
      if (y === year) months[m - 1] += Number(exp.amount);
    });
    return months;
  }

  const days = Array(getDaysInMonth(month, year)).fill(0);
  expenses.forEach(exp => {
    const [y, m, d] = exp.date.split('-').map(Number);
    if (m === month && y === year) days[d - 1] += Number(exp.amount);
  });
  return days;
}

//💎 Create the chart (glow + smooth line)
let chartInstance;

function renderChart(dailyData) {
  // console.log("🎯 renderChart called", dailyData);
  const canvas = document.getElementById("spendingChart");
  // console.log("📦 canvas:", canvas);
  if (!canvas) return;

  const loader = document.getElementById("chartLoading");
  if (loader) loader.style.display = 'none';

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  // Force canvas pixel dimensions directly — no CSS tricks
  const wrap = canvas.parentElement;
//   console.log("📐 wrap dimensions:", wrap.offsetWidth, wrap.offsetHeight);
//   console.log("📐 canvas dimensions:", canvas.offsetWidth, canvas.offsetHeight);

//   console.log("📊 Chart available:", typeof Chart);
// console.log("📊 dailyData has values:", dailyData.some(v => v > 0));
// console.log("📐 wrap w/h:", wrap.offsetWidth, wrap.offsetHeight);
// console.log("📐 canvas w/h after set:", canvas.width, canvas.height);
// console.log("🎨 canvas style:", canvas.style.cssText);
// console.log("🎨 wrap style:", wrap.style.cssText);
// console.log("👁️ wrap visible:", wrap.offsetParent !== null);
  const w = wrap.offsetWidth || 800;
  canvas.width  = w;
  canvas.height = 240;
  canvas.style.display = 'block';

  const ctx = canvas.getContext("2d");
  const isAllMonths = dailyData.length === 12;
  const labels = isAllMonths
    ? monthNames
    : Array.from({ length: dailyData.length }, (_, i) => i + 1);

  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, "rgba(124, 92, 255, 0.35)");
  gradient.addColorStop(0.6, "rgba(124, 92, 255, 0.08)");
  gradient.addColorStop(1, "rgba(124, 92, 255, 0)");

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: dailyData,
        borderColor: "#a78bfa",
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#a78bfa",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
        borderWidth: 2.5,
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#1e1b3a',
          borderColor: 'rgba(167,139,250,0.3)',
          borderWidth: 1,
          titleColor: '#8b90a8',
          bodyColor: '#a78bfa',
          bodyFont: { size: 15, weight: '500' },
          titleFont: { size: 11 },
          padding: 10,
          displayColors: false,
          callbacks: {
            title: items => `Day ${items[0].label}`,
            label: item => `₹${Number(item.raw).toLocaleString('en-IN')}`,
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: 'rgba(139,144,168,0.6)',
            font: { size: 11 },
            maxTicksLimit: 10,
          }
        },
        y: {
          position: 'right',
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          border: { display: false, dash: [4, 4] },
          ticks: {
            color: 'rgba(139,144,168,0.6)',
            font: { size: 11 },
            callback: v => v === 0 ? '' : '₹' + Number(v).toLocaleString('en-IN'),
          }
        }
      }
    }
  });
}

 document.addEventListener('DOMContentLoaded', () => {
 });

 /* ══════════════════════════════════════════════════════════════
   REGRET TAGGING
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  const csrf = () => document.querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');

  document.getElementById('ecList')?.addEventListener('click', async (e) => {

    // ── Regret / Worth it button ───────────────────────────────
    const btn = e.target.closest('[data-regret-val]');
    if (btn) {
      e.stopPropagation();
      const id       = btn.dataset.regretId;
      const isRegret = btn.dataset.regretVal === 'true';
      const row      = btn.closest('.ec-row');
      const noteRow  = document.getElementById(`regretNote_${id}`);

      // Find both buttons for this row
      const worthBtn  = row.querySelector('[data-regret-val="false"]');
      const regretBtn = row.querySelector('[data-regret-val="true"]');

      // Toggle off if already active
      const wasActive = btn.classList.contains(
        isRegret ? 'ec-btn--regret-active' : 'ec-btn--worth-active'
      );
      const newValue = wasActive ? null : isRegret;

      // Update button styles instantly
      worthBtn?.classList.remove('ec-btn--worth-active');
      regretBtn?.classList.remove('ec-btn--regret-active');
      if (newValue === false) worthBtn?.classList.add('ec-btn--worth-active');
      if (newValue === true)  regretBtn?.classList.add('ec-btn--regret-active');

      // Update row border
      row?.classList.remove('ec-row--worth', 'ec-row--regret');
      if (newValue === false) row?.classList.add('ec-row--worth');
      if (newValue === true)  row?.classList.add('ec-row--regret');

      // Show note chips only for regret
      if (noteRow) {
        noteRow.style.display = (newValue === true) ? 'block' : 'none';
      }

      // PATCH to backend
      try {
        await fetch(`/api/expenses/${id}/regret`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf()
          },
          body: JSON.stringify({ is_regret: newValue })
        });
      } catch (err) {
        console.error('Regret tag failed:', err);
      }
      return;
    }

    // ── Note chip ──────────────────────────────────────────────
    const chip = e.target.closest('.ec-regret-chip');
    if (chip) {
      e.stopPropagation();
      const noteRow  = chip.closest('.ec-regret-note-row');
      const id       = noteRow?.id?.replace('regretNote_', '');
      const note     = chip.dataset.note || null;

      noteRow.style.display = 'none';

      try {
        await fetch(`/api/expenses/${id}/regret`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf()
          },
          body: JSON.stringify({ is_regret: true, regret_note: note })
        });
      } catch (err) {
        console.error('Regret note failed:', err);
      }
    }

  });
});
