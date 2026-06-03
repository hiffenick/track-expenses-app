/* ═══════════════════════════════════════════
   EXPENSO — Analytics Tab JS
   Chart.js 4 · All features wired up
═══════════════════════════════════════════ */

'use strict';

/* ── MOCK DATA (replace with real API calls) ── */
/* ═══════════════════════════════════════════
   GLOBAL ANALYTICS STATE
═══════════════════════════════════════════ */

let DATA = null;

const FILTER_STATE = {
  time: 'this_month',
  cat: 'all',
};

const CHART_INSTANCES = {};

const COLORS = {
  food: '#f97316',
  travel: '#3b82f6',
  shopping: '#ec4899',
  bills: '#f59e0b',
  entertainment: '#a855f7',
  savings: '#22c55e',
};

Chart.defaults.color = '#8892a4';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'DM Sans', system-ui, sans-serif";
Chart.defaults.font.size = 11;

const $ = id => document.getElementById(id);

const formatINR = n =>
  '₹' + Number(n || 0).toLocaleString('en-IN');

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ── CHART.JS GLOBAL DEFAULTS ── */
/* ═══════════════════════════════════════════
   FETCH ANALYTICS DATA
═══════════════════════════════════════════ */

async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');

    if (!res.ok) {
      throw new Error('Failed to load analytics');
    }

    DATA = await res.json();

    DATA.insights = buildInsights();
    DATA.insightIdx = 0;

    initializeAnalytics();

  } catch (err) {
    console.error(err);

    const body = document.querySelector('.dashboard-body');

    if (body) {
      body.innerHTML = `
        <div class="glass-card"
             style="padding:40px;text-align:center;">
          <h2 style="margin-bottom:10px;">
            Failed to load analytics
          </h2>
          <p style="color:#8892a4;">
            Please refresh the page.
          </p>
        </div>
      `;
    }
  }
}
function buildInsights() {

  const insights = [];

  const total = DATA.month_total || 0;
  const streak = DATA.streak.current || 0;

  insights.push(
    `You've spent <strong>${formatINR(total)}</strong> this month. Your no-spend streak is <strong>${streak} days</strong>.`
  );

  const momTotal = Object.values(DATA.mom)
    .flat()
    .reduce((a, b) => a + b, 0);

  if (momTotal > 0) {
    insights.push(
      `Your strongest category this month appears to be <strong>savings</strong>. Keep stacking wins.`
    );
  }

  insights.push(
    `Your spending fingerprint is evolving — your financial discipline is becoming more consistent.`
  );

  return insights;
}
/* ════════════════════════════════
   1. INSIGHTS STRIP
   HTML ids: insightText, insightRefresh
════════════════════════════════ */
function initInsights() {
  const el  = $('insightText');     // ← was 'insightsText'
  const btn = $('insightRefresh');  // ← was 'insightsRefresh'

  if (!el || !btn) {
    console.warn('[Expenso] Insight elements not found.');
    return;
  }

  const show = () => { el.innerHTML = DATA.insights[DATA.insightIdx]; };
  show();
  el.style.transition = 'opacity 0.15s';

  btn.addEventListener('click', () => {
    DATA.insightIdx = (DATA.insightIdx + 1) % DATA.insights.length;
    el.style.opacity = 0;
    setTimeout(() => { show(); el.style.opacity = 1; }, 150);
  });
}

/* ════════════════════════════════
   2. RADAR — Spending Fingerprint
════════════════════════════════ */
function initRadar() {

  const canvas = $('radarChart');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  new Chart(ctx, {

    type: 'radar',

    data: {

      labels: DATA.radar.axes,

      datasets: [
        {
          label: 'Current',
          data: DATA.radar.may,
          borderColor: '#7c6df0',
          backgroundColor: 'rgba(124,109,240,0.15)',
          pointBackgroundColor: '#7c6df0',
          borderWidth: 2,
        },
        {
          label: 'Previous',
          data: DATA.radar.apr,
          borderColor: '#14b8a6',
          backgroundColor: 'rgba(20,184,166,0.08)',
          borderDash: [5,5],
          borderWidth: 2,
        }
      ]
    },

    options: {

      responsive: true,

      plugins: {
        legend: { display: false }
      },

      scales: {
        r: {
          min: 0,
          max: 100,

          ticks: {
            display: false
          }
        }
      }
    }
  });
}

/* ════════════════════════════════
   3. LINE — Projected Month-End
════════════════════════════════ */
function initProjection() {

  const canvas = $('projectionChart');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const actuals = DATA.daily_array;

  let cumulative = 0;

  const cumulativeActual = actuals.map(v => {

    if (v != null) {
      cumulative += v;
      return cumulative;
    }

    return null;
  });

  const completedDays =
    actuals.filter(v => v !== null).length;

  const pace =
    completedDays > 0
      ? cumulative / completedDays
      : 0;

  const projected =
    DATA.daily_array.map((_, idx) =>
      Math.round(pace * (idx + 1))
    );

  const best =
    projected.map(v => Math.round(v * 0.8));

  const worst =
    projected.map(v => Math.round(v * 1.2));

  const endProjected =
    projected[projected.length - 1];

  $('projVal').textContent =
    formatINR(endProjected);

  $('projRange').textContent =
    `${formatINR(best.at(-1))} – ${formatINR(worst.at(-1))}`;

  $('statProjected').textContent =
    formatINR(endProjected);

  $('statProjRange').textContent =
    `Range: ${formatINR(best.at(-1))} – ${formatINR(worst.at(-1))}`;

  new Chart(ctx, {
    type: 'line',

    data: {
      labels:
        Array.from(
          { length: DATA.days_in_month },
          (_, i) => i + 1
        ),

      datasets: [
        {
          label: 'Actual',
          data: cumulativeActual,
          borderColor: '#7c6df0',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
        },
        {
          label: 'Projected',
          data: projected,
          borderColor: '#94a3b8',
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.4,
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: { display: false }
      },

      scales: {
        x: {
          grid: { display: false }
        },

        y: {
          ticks: {
            callback: v => formatINR(v)
          }
        }
      }
    }
  });
}

/* ════════════════════════════════
   4. BAR — Month-over-Month
════════════════════════════════ */
function initMoM() {

  const canvas = $('momChart');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const categories = Object.keys(DATA.mom);

  const legend = $('momLegend');

  legend.innerHTML = '';

  categories.forEach(cat => {

    const item = document.createElement('div');

    item.className = 'an-mom-legend-item';

    item.innerHTML = `
      <div class="an-mom-legend-dot"
           style="background:${COLORS[cat]}"></div>
      ${capitalize(cat)}
    `;

    legend.appendChild(item);
  });

  const datasets = categories.map(cat => ({
    label: capitalize(cat),
    data: DATA.mom[cat],
    backgroundColor: COLORS[cat],
    borderRadius: 6,
    borderSkipped: false,
  }));

  new Chart(ctx, {
    type: 'bar',

    data: {
      labels: DATA.months,
      datasets
    },

    options: {

      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: { display: false }
      },

      scales: {
        x: {
          stacked: true
        },

        y: {
          stacked: true,

          ticks: {
            callback: v => formatINR(v)
          }
        }
      }
    }
  });
}

function showDrill(month, cat, amt, color) {
  const drill   = $('drillPanel');   // ← was 'momDrill'
  const titleEl = $('drillTitle');
  const body    = $('drillBody');    // ← was 'drillContent'

  if (!drill || !titleEl || !body) return;

  titleEl.textContent = `${month} · ${cat.charAt(0).toUpperCase() + cat.slice(1)} — ${formatINR(amt)}`;

  const mockTxns = [
    { title: 'Sample entry 1', amount: Math.round(amt * 0.4) },
    { title: 'Sample entry 2', amount: Math.round(amt * 0.35) },
    { title: 'Sample entry 3', amount: Math.round(amt * 0.25) },
  ].filter(t => t.amount > 0);

  body.innerHTML = mockTxns.map(t =>
    `<div class="an-drill-tag" style="border-color:${color}40">
      <strong style="color:${color}">${formatINR(t.amount)}</strong>
      <span style="color:#8892a4"> · ${t.title}</span>
    </div>`
  ).join('');

  drill.hidden = false;   // ← was drill.style.display = 'block'

  $('drillClose').onclick = () => { drill.hidden = true; };
}

/* ════════════════════════════════
   5. HEATMAP
════════════════════════════════ */
function initHeatmap() {
  const grid    = $('heatmapGrid');
  const tooltip = $('heatmapTooltip');
  if (!grid || !tooltip) return;

  const maxAmt = Math.max(...DATA.heatmap.flat().map(c => c.amount));
  const weeks  = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];

  DATA.heatmap.forEach((row, wi) => {
    const rowEl = document.createElement('div');
    rowEl.className = 'an-hm-row';

    const wLabel = document.createElement('div');
    wLabel.className = 'an-hm-week-label';
    wLabel.textContent = weeks[wi];
    rowEl.appendChild(wLabel);

    row.forEach(cell => {
      const el = document.createElement('div');
      el.className = 'an-hm-cell';

      if (!cell.day) {
        el.style.visibility = 'hidden';
      } else {
        const level = cell.amount === 0 ? 0
          : cell.amount < maxAmt * 0.2  ? 1
          : cell.amount < maxAmt * 0.4  ? 2
          : cell.amount < maxAmt * 0.65 ? 3
          : cell.amount < maxAmt * 0.85 ? 4 : 5;
        el.classList.add(`level-${level}`);
        if (cell.day === DATA.today_day) {
          el.classList.add('today');
        }

        el.addEventListener('mouseenter', () => {
          tooltip.style.display = 'block';
          tooltip.innerHTML = `
            <div class="tt-date">${cell.label}</div>
            <div class="tt-amount">${formatINR(cell.amount)}</div>
            ${cell.amount > 0
              ? '<div class="tt-top">Tap to view transactions</div>'
              : '<div class="tt-top" style="color:#22c55e">No-spend day 🎯</div>'}
          `;
        });

        el.addEventListener('mousemove', e => {
          const tw = tooltip.offsetWidth;
          const th = tooltip.offsetHeight;
          let x = e.clientX + 12;
          let y = e.clientY - th - 8;
          if (x + tw > window.innerWidth - 10) x = e.clientX - tw - 8;
          if (x < 0) x = 8;

          if (y < 8) y = e.clientY + 16;
          tooltip.style.left = x + 'px';
          tooltip.style.top  = y + 'px';
        });

        el.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
      }

      rowEl.appendChild(el);
    });

    grid.appendChild(rowEl);
  });
}

/* ════════════════════════════════
   6. REGRET SCORE
════════════════════════════════ */
function initRegret() {
  const list = $('regretList');
  if (!list) return;

  (Array.isArray(DATA.regret) ? DATA.regret : []).forEach(item => {
    const el = document.createElement('div');
    el.className = 'an-regret-item';

    el.innerHTML = `
      <span class="an-regret-cat">${item.cat}</span>
      <div class="an-regret-bar-wrap">
        <div class="an-regret-bar"
             style="width:0%; background:${item.color}"
             data-target="${item.pct}">
        </div>
      </div>
      <span class="an-regret-pct">${item.pct}%</span>
    `;

    list.appendChild(el);
  });

  setTimeout(() => {
    document.querySelectorAll('.an-regret-bar').forEach(bar => {
      bar.style.transition = 'width 0.6s ease';
      bar.style.width = bar.dataset.target + '%';
    });
  }, 300);
}

/* ════════════════════════════════
   7. HABIT STREAK CALENDAR
════════════════════════════════ */
function initStreak() {
  const container = $('streakMonths');
  if (!container) return;

  let totalNoSpend   = 0;
  let bestStreak = DATA.streak.best || 0;
  let currentStreak  = DATA.streak.current || 0;

  DATA.streak.months.forEach((month, mi) => {
    const block = document.createElement('div');
    block.className = 'an-streak-month-block';
    block.innerHTML = `<div class="an-streak-month-label">${month.label}</div>`;

    const gridEl = document.createElement('div');
    gridEl.className = 'an-streak-month-grid';

    month.days.forEach((state, i) => {
      const day = document.createElement('div');
      day.className = `an-streak-day ${state}`;
      day.title = `${month.label} ${i + 1} · ${
        state === 'streak'  ? '🔥 On streak!'   :
        state === 'nospend' ? '✅ No spend'      :
        state === 'spent'   ? '💸 Spent'         :
        state === 'light'   ? '🟣 Light spend'   : ''}`;
      gridEl.appendChild(day);

      // Stats counting
      if (state === 'nospend' || state === 'streak') {
        totalNoSpend++;
        // tempStreak++;
        // bestStreak = Math.max(bestStreak, tempStreak);
      // } else if (state !== 'future') {
      //   tempStreak = 0;
      }
    });

    block.appendChild(gridEl);
    container.appendChild(block);
  });

  // Current streak = last consecutive no-spend/streak days from today
  // const mayDays = DATA.streak.months[4].days;
  // for (let i = 16; i >= 0; i--) {
  //   if (mayDays[i] === 'streak' || mayDays[i] === 'nospend') currentStreak++;
  //   else break;
  // }

  // Update stat counters
  const ssCurrentStreak = $('ssCurrentStreak');
  const ssBestStreak    = $('ssBestStreak');
  const ssNoSpendDays   = $('ssNoSpendDays');
  const statStreak      = $('statStreak');
  const statStreakBest  = $('statStreakBest');

  if (ssCurrentStreak) ssCurrentStreak.textContent = currentStreak;
  if (ssBestStreak)    ssBestStreak.textContent    = bestStreak;
  if (ssNoSpendDays)
  ssNoSpendDays.textContent = DATA.streak.no_spend_days;
  if (statStreak)      statStreak.textContent       = currentStreak;
  if (statStreakBest)  statStreakBest.textContent    = `Best this year: ${bestStreak} days`;
}

/* ════════════════════════════════
   8. PERIOD SELECTOR
   HTML class: an-period-btn
════════════════════════════════ */
function initPeriodSelector() {
  document.querySelectorAll('.an-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {

      document.querySelectorAll('.an-period-btn')
        .forEach(b => b.classList.remove('active'));

      btn.classList.add('active');

      FILTER_STATE.time = btn.dataset.period;

      applyFilters(FILTER_STATE);
    });
  });
}

/* ════════════════════════════════
   9. MOBILE SIDEBAR
   HTML id: hamburgerBtn (not hamburger)
════════════════════════════════ */
function initSidebar() {
  const sidebar   = $('sidebar');
  const overlay   = $('sidebarOverlay');
  const hamburger = $('hamburgerBtn');   // ← was 'hamburger'

  if (!sidebar || !overlay || !hamburger) {
    console.warn('[Expenso] Sidebar elements not found.');
    return;
  }

  const open  = () => { sidebar.classList.add('open');    overlay.classList.add('active');    document.body.style.overflow = 'hidden'; };
  const close = () => { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; };

  hamburger.addEventListener('click', open);
  overlay.addEventListener('click', close);

  document.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', () => { if (window.innerWidth <= 900) close(); });
  });
}

/* ════════════════════════════════
   STAT CARDS — populate on load
════════════════════════════════ */
function initStatCards() {
  // Total this month
  const mayTotal = Object.values(DATA.mom).reduce((s, arr) => s + arr[5], 0);
  const aprTotal = Object.values(DATA.mom).reduce((s, arr) => s + arr[4], 0);
  const diff     = mayTotal - aprTotal;
  const diffSign = diff >= 0 ? '+' : '';

  const statMonthTotal = $('statMonthTotal');
  const statDelta      = $('statDelta');
  const statTxCount    = $('statTxCount');

  if (statMonthTotal) statMonthTotal.textContent = formatINR(mayTotal);
  if (statDelta) {
    statDelta.textContent = `${diffSign}${formatINR(Math.abs(diff))} vs last month`;
    statDelta.className   = `an-sc-delta ${diff <= 0 ? 'an-delta--good' : 'an-delta--up'}`;
  }
  // Mock tx count
  if (statTxCount) {
  statTxCount.textContent = DATA.tx_count;
}
}

/* ════════════════════════════════
   INIT
════════════════════════════════ */
function initializeAnalytics() {

  initInsights();
  initStatCards();
  initRadar();
  initProjection();
  initMoM();
  initHeatmap();
  initRegret();
  initStreak();
  initPeriodSelector();
  initSidebar();
  initFilterBar();
}

document.addEventListener('DOMContentLoaded', () => {
  loadAnalytics();
});

/* ═══════════════════════════════════════════════════════════════
   ANALYTICS FILTERS — append this entire block to analytics.js
   Adds: time filter + category filter with live chart re-render
   Zero breaking changes to existing functions.
═══════════════════════════════════════════════════════════════ */

/* ── Filter state ────────────────────────────────────────── */


/* ── Cached Chart.js instances so we can destroy & re-init ── */


/* ────────────────────────────────────────────────────────────
   destroyCharts()
   Call before re-rendering to prevent "canvas already in use"
──────────────────────────────────────────────────────────── */
function destroyCharts() {
  ['radarChart', 'projectionChart', 'momChart'].forEach(id => {
    const instance = Chart.getChart(id);
    if (instance) instance.destroy();
  });
}

/* ────────────────────────────────────────────────────────────
   showFilterLoading() / hideFilterLoading()
   Skeleton shimmer on canvas wrappers while fetching
──────────────────────────────────────────────────────────── */
function showFilterLoading() {
  document.querySelectorAll('.an-canvas-wrap').forEach(el => {
    el.style.opacity = '0.35';
    el.style.pointerEvents = 'none';
  });
  document.getElementById('filterBar').classList.add('an-filter-loading');
}

function hideFilterLoading() {
  document.querySelectorAll('.an-canvas-wrap').forEach(el => {
    el.style.opacity = '1';
    el.style.pointerEvents = '';
  });
  document.getElementById('filterBar').classList.remove('an-filter-loading');
}

/* ────────────────────────────────────────────────────────────
   buildApiUrl(state)
   Constructs /api/analytics?period=X&category=Y
──────────────────────────────────────────────────────────── */
function buildApiUrl(state) {
  const params = new URLSearchParams();
  params.set('period', state.time);
  if (state.cat !== 'all') params.set('category', state.cat);
  return `/api/analytics?${params.toString()}`;
}

/* ────────────────────────────────────────────────────────────
   updateFilterSummary(state)
   Shows / hides the "Filtered" badge and Reset button
──────────────────────────────────────────────────────────── */
function updateFilterSummary(state) {
  const summary     = document.getElementById('filterSummary');
  const summaryText = document.getElementById('filterSummaryText');
  const resetBtn    = document.getElementById('filterReset');

  const isDefault =
    state.time === 'this_month' && state.cat === 'all';

  if (isDefault) {
    summary.classList.remove('visible');
    resetBtn.style.display = 'none';
    return;
  }

  const parts = [];
  const timeLabels = {
    this_week: 'This Week', last_month: 'Last Month', this_year: 'This Year',
  };
  if (state.time !== 'this_month') parts.push(timeLabels[state.time] || state.time);
  if (state.cat !== 'all')         parts.push(state.cat.charAt(0).toUpperCase() + state.cat.slice(1));

  summaryText.textContent = parts.join(' · ');
  summary.classList.add('visible');
  resetBtn.style.display = 'inline-flex';
}

/* ────────────────────────────────────────────────────────────
   applyFilters(state)
   Main orchestrator: fetch → destroy → re-render everything
──────────────────────────────────────────────────────────── */
async function applyFilters(state) {
  showFilterLoading();
  updateFilterSummary(state);

  try {
    const res = await fetch(buildApiUrl(state));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    DATA = await res.json();
    DATA.insights  = buildInsights();
    DATA.insightIdx = 0;

    /* ── Clear dynamic DOM sections ── */
    const heatmapGrid  = document.getElementById('heatmapGrid');
    const regretList   = document.getElementById('regretList');
    if (regretList) regretList.innerHTML = '';
    const streakMonths = document.getElementById('streakMonths');
    if (heatmapGrid)  heatmapGrid.innerHTML  = '';
    if (regretList)   regretList.innerHTML   = '';
    if (streakMonths) streakMonths.innerHTML = '';

    /* ── Destroy existing charts ── */
    destroyCharts();

    /* ── Re-run all init functions ── */
    initInsights();
    initStatCards();
    initRadar();
    initProjection();
    initMoM();
    initHeatmap();
    initStreak();
    initRegret();

  } catch (err) {
    console.error('[Expenso] Filter fetch failed:', err);
  } finally {
    hideFilterLoading();
  }
}

/* ────────────────────────────────────────────────────────────
   initFilterBar()
   Wires up pill click + reset button.
   Call this once from initializeAnalytics().
──────────────────────────────────────────────────────────── */
function initFilterBar() {

  /* ── Time pills ── */
  document.getElementById('timeFilterGroup')
    .querySelectorAll('.an-filter-pill')
    .forEach(pill => {
      pill.addEventListener('click', () => {
        if (pill.dataset.value === FILTER_STATE.time) return; /* no-op */

        document.querySelectorAll('#timeFilterGroup .an-filter-pill')
          .forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        FILTER_STATE.time = pill.dataset.value;
        applyFilters(FILTER_STATE);
      });
    });

  /* ── Category pills ── */
  document.getElementById('catFilterGroup')
    .querySelectorAll('.an-filter-pill')
    .forEach(pill => {
      pill.addEventListener('click', () => {
        if (pill.dataset.value === FILTER_STATE.cat) return; /* no-op */

        document.querySelectorAll('#catFilterGroup .an-filter-pill')
          .forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        FILTER_STATE.cat = pill.dataset.value;
        applyFilters(FILTER_STATE);
      });
    });

  /* ── Reset button ── */
  document.getElementById('filterReset').addEventListener('click', () => {
    FILTER_STATE.time = 'this_month';
    FILTER_STATE.cat  = 'all';

    /* reset pill UI */
    document.querySelectorAll('#timeFilterGroup .an-filter-pill')
      .forEach(p => p.classList.toggle('active', p.dataset.value === 'this_month'));
    document.querySelectorAll('#catFilterGroup .an-filter-pill')
      .forEach(p => p.classList.toggle('active', p.dataset.value === 'all'));

    applyFilters(FILTER_STATE);
  });
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

