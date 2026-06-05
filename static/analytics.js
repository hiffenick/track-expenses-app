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
/* ════════════════════════════════
   8. PERIOD SELECTOR (hero strip)
   Syncs with filter bar pills
════════════════════════════════ */

// Map hero strip data-period values → filter bar data-value equivalents
const HERO_TO_FILTER = {
  // "jun"  = current month  → this_month
  // "may"  = previous month → last_month
  // "3m"   = 3-month range  → this_year (reuse; or add a new backend period)
  // "6m"   = 6-month range  → this_year
};
// We'll build this dynamically after we know current/prev month names (below).

function initPeriodSelector() {
  document.querySelectorAll('.an-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {

      // 1. Mark hero strip active
      document.querySelectorAll('.an-period-btn')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 2. Map hero period → API period
      const heroPeriod = btn.dataset.period;
      const apiPeriod  = HERO_TO_FILTER[heroPeriod] || 'this_month';

      // 3. Sync the filter-bar time pills
      document.querySelectorAll('#timeFilterGroup .an-filter-pill')
        .forEach(p => {
          p.classList.toggle('active', p.dataset.value === apiPeriod);
        });

      // 4. Update state & fetch
      FILTER_STATE.time = apiPeriod;
      applyFilters(FILTER_STATE);
    });
  });
}

/* ── Bottom: set hero button labels + build HERO_TO_FILTER map ── */
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun",
                    "Jul","Aug","Sep","Oct","Nov","Dec"];
const now          = new Date();
const currentMonth = now.getMonth();               // 0-based
const prevMonth    = (currentMonth - 1 + 12) % 12;

const currentLabel = monthNames[currentMonth];     // e.g. "Jun"
const prevLabel    = monthNames[prevMonth];        // e.g. "May"

// Hero strip: first two buttons are PERIOD (current / previous month)
const heroBtns = document.querySelectorAll('.an-period-btn');
if (heroBtns[0]) heroBtns[0].querySelector('.an-pb-val').textContent = currentLabel;
if (heroBtns[1]) heroBtns[1].querySelector('.an-pb-val').textContent = prevLabel;

// Build the mapping now that we have the labels
// data-period values are set lowercase in HTML: "may", "apr" etc.
// We normalise by reading the actual rendered label.
if (heroBtns[0]) heroBtns[0].dataset.period = 'cur';
if (heroBtns[1]) heroBtns[1].dataset.period = 'prev';
// 3M / 6M buttons stay as-is (data-period="3m" / "6m")

HERO_TO_FILTER['cur']  = 'this_month';
HERO_TO_FILTER['prev'] = 'last_month';
HERO_TO_FILTER['3m']   = 'this_year';   // closest available; shows 3–6 months
HERO_TO_FILTER['6m']   = 'this_year';

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
  const momArrays  = Object.values(DATA.mom);
  const lastIdx    = momArrays.length > 0 ? momArrays[0].length - 1 : 0;
  const prevIdx    = lastIdx - 1;

  const mayTotal = momArrays.reduce((s, arr) => s + (arr[lastIdx] ?? 0), 0);
  const aprTotal = prevIdx >= 0
    ? momArrays.reduce((s, arr) => s + (arr[prevIdx] ?? 0), 0)
    : 0;
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
function syncHeroStrip(apiPeriod) {
  const reverseMap = {
    'this_month': 'cur',
    'last_month': 'prev',
    'this_year':  '6m',
    'this_week':  null,
  };
  const target = reverseMap[apiPeriod] ?? null;
  document.querySelectorAll('.an-period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === target);
  });
}

function initFilterBar() {

  /* ── Time pills ── */
  document.getElementById('timeFilterGroup')
    .querySelectorAll('.an-filter-pill')
    .forEach(pill => {
      pill.addEventListener('click', () => {
        if (pill.dataset.value === FILTER_STATE.time) return;

        document.querySelectorAll('#timeFilterGroup .an-filter-pill')
          .forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        FILTER_STATE.time = pill.dataset.value;
        syncHeroStrip(FILTER_STATE.time);   // ← syncs hero strip
        applyFilters(FILTER_STATE);
      });
    });

  /* ── Category pills ── */
  document.getElementById('catFilterGroup')
    .querySelectorAll('.an-filter-pill')
    .forEach(pill => {
      pill.addEventListener('click', () => {
        if (pill.dataset.value === FILTER_STATE.cat) return;

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

    document.querySelectorAll('#timeFilterGroup .an-filter-pill')
      .forEach(p => p.classList.toggle('active', p.dataset.value === 'this_month'));
    document.querySelectorAll('#catFilterGroup .an-filter-pill')
      .forEach(p => p.classList.toggle('active', p.dataset.value === 'all'));

    syncHeroStrip('this_month');   // ← resets hero strip to "Jun"
    applyFilters(FILTER_STATE);
  });
}
