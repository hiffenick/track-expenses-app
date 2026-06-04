/**
 * dashboard.js — Expenso Dashboard
 * Place at: static/js/dashboard.js
 */

/* ── Page Labels ──────────────────────────────────────────── */
const PAGE_LABELS = {
  'dashboard':     'Overview',
  'add-expense':   'Add Expense',
  'view-expenses': 'View Expenses',
  'analytics':     'Analytics',
  'categories':    'Categories',
  'profile':       'Profile & Settings',
};

/* ── Toast helper ─────────────────────────────────────────── */
// function showToast(message, duration = 2400) {
//   const toast = document.getElementById('navToast');
//   if (!toast) return;
//   toast.textContent = message;
//   toast.classList.add('show');
//   setTimeout(() => toast.classList.remove('show'), duration);
// }

/* ── Navigation ───────────────────────────────────────────── */
function navigateTo(page) {
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update breadcrumb
  const label = document.getElementById('currentPageLabel');
  if (label) label.textContent = PAGE_LABELS[page] || page;

  // Show toast (stub — replace with real routing)
  if (page !== 'dashboard') {
    showToast(`Navigating to ${PAGE_LABELS[page] || page}…`);
  }

  // Close sidebar on mobile after nav
  closeSidebar();

  /*
   * TODO: Replace the toast stub with your actual routing logic.
   * Examples:
   *   window.location.href = `/${page}`;        // full page nav
   *   router.push(`/${page}`);                  // SPA router
   *   loadView(page);                           // AJAX / SPA view swap
   */
}

/* ── Bind all nav links and quick-action buttons ──────────── */
// function bindNavigation() {
//   document.querySelectorAll('[data-page]').forEach(el => {
//     el.addEventListener('click', e => {
//       e.preventDefault();
//       const page = el.dataset.page;
//       if (page) navigateTo(page);
//     });
//   });
// }


/* ── Live date display ────────────────────────────────────── */
function updateDate() {
  const el = document.getElementById('liveDateDisplay');
  if (!el) return;
  const now = new Date();
  el.innerHTML = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/* ── Summary data ─────────────────────────────────────────── */
function loadSummaryData() {
  try {
    const raw  = document.getElementById('summary-data')?.textContent;
    const data = raw ? JSON.parse(raw) : null;
    if (!data) return;

    const fmt = v => v != null ? `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';

    const total   = document.getElementById('totalSpent');
    const monthly = document.getElementById('monthlySpent');
    const topCat  = document.getElementById('topCategory');
    const trend   = document.getElementById('trendValue');

    if (total)   total.textContent   = data.total_spent   != null ? fmt(data.total_spent)   : '—';
    if (monthly) monthly.textContent = data.monthly_spent != null ? fmt(data.monthly_spent) : '—';
    if (topCat)  topCat.textContent  = data.top_category  || '—';

    if (trend) {
      const diff = data.trend_percent;
      if (diff != null) {
        const sign  = diff >= 0 ? '+' : '';
        const color = diff <= 0 ? 'var(--teal)' : 'var(--rose)';
        trend.textContent = `${sign}${diff.toFixed(1)}%`;
        trend.style.color = color;
      } else {
        trend.textContent = '—';
      }
    }

    return data;
  } catch (err) {
    console.warn('Could not parse summary data:', err);
    return null;
  }
}

/* ── Chart rendering ──────────────────────────────────────── */
function renderDashboardChart(data) {
  const ctx = document.getElementById('expenseChart');
  if (!ctx) return;

  if (typeof Chart === 'undefined') {
    ctx.closest('.chart-wrapper').innerHTML =
      '<p style="color:#8b90a8;font-size:13px;text-align:center;padding:40px 20px;">Chart.js not loaded.</p>';
    return;
  }

  const categories = data?.categories || {};
  const labels  = Object.keys(categories);
  const values  = Object.values(categories);

  if (!labels.length) {
    ctx.closest('.chart-wrapper').innerHTML =
      '<p style="color:#8b90a8;font-size:13px;text-align:center;padding:40px 20px;">No expense data yet.</p>';
    return;
  }

  const PALETTE = [
    '#e8a84c','#4ec9b0','#a78bfa','#f87171',
    '#60a5fa','#fb923c','#34d399','#f472b6',
  ];

  const total = values.reduce((a, b) => a + b, 0);
  const sorted = labels
    .map((l, i) => ({ label: l, value: values[i], color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value);

  const wrapper = ctx.closest('.chart-wrapper');

  // ── Build layout ──
  wrapper.innerHTML = `
    <div class="premium-chart-wrap">
      <div class="premium-donut-area" id="donutArea">
        <canvas id="expenseChartCanvas"></canvas>
        <div class="donut-center-label">
          <span class="donut-total">₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          <span class="donut-sublabel">total</span>
        </div>
      </div>
      <div class="premium-bar-area" id="barArea" style="display:none;">
        <canvas id="expenseBarCanvas"></canvas>
      </div>
      <div class="premium-legend" id="premiumLegend"></div>
    </div>
  `;

  // ── Legend ──
  const legendEl = document.getElementById('premiumLegend');
  legendEl.innerHTML = sorted.map(item => {
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    return `
      <div class="legend-row">
        <div class="legend-top">
          <div class="legend-dot-label">
            <span class="legend-dot" style="background:${item.color}"></span>
            <span class="legend-name">${item.label}</span>
          </div>
          <span class="legend-amount">₹${item.value.toLocaleString('en-IN')}</span>
        </div>
        <div class="legend-bar-track">
          <div class="legend-bar-fill" style="width:${pct}%;background:${item.color}"></div>
        </div>
      </div>
    `;
  }).join('');

  if (sorted.length) {
    const top = sorted[0];
    const topPct = total > 0 ? ((top.value / total) * 100).toFixed(1) : 0;
    legendEl.innerHTML += `
      <div class="legend-insight">
        <span class="insight-dot" style="background:${top.color}"></span>
        <span><strong>${top.label}</strong> is ${topPct}% of spending this period.</span>
      </div>
    `;
  }

  // ── Donut chart ──
  const donutCtx = document.getElementById('expenseChartCanvas');
  const donutChart = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(s => s.label),
      datasets: [{
        data: sorted.map(s => s.value),
        backgroundColor: sorted.map(s => s.color),
        borderColor: '#12152a',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      cutout: '72%',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const val = ctx.parsed;
              const pct = total ? ((val / total) * 100).toFixed(1) : 0;
              return `  ₹${val.toLocaleString('en-IN')}  (${pct}%)`;
            },
          },
          backgroundColor: '#1e2130',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#f0f2f8',
          bodyColor: '#8b90a8',
          padding: 12,
        },
      },
    },
  });

  // ── Bar chart ──
  const barCtx = document.getElementById('expenseBarCanvas');
  const barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s.label),
      datasets: [{
        data: sorted.map(s => s.value),
        backgroundColor: sorted.map(s => s.color + 'cc'),
        borderColor: sorted.map(s => s.color),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `  ₹${ctx.parsed.x.toLocaleString('en-IN')}`,
          },
          backgroundColor: '#1e2130',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#f0f2f8',
          bodyColor: '#8b90a8',
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#8b90a8',
            font: { family: "'DM Sans', sans-serif", size: 10 },
            callback: v => `₹${Number(v).toLocaleString('en-IN')}`,
          },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: '#c4c8e0',
            font: { family: "'DM Sans', sans-serif", size: 11 },
          },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });

  // ── Wire up pill toggle buttons ──
  const pillBtns = document.querySelectorAll('.card-actions .pill-btn');
  const donutArea = document.getElementById('donutArea');
  const barArea   = document.getElementById('barArea');

  pillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (btn.textContent.trim() === 'Bar') {
        donutArea.style.display = 'none';
        barArea.style.display   = 'block';
        barChart.resize();
      } else {
        donutArea.style.display = 'block';
        barArea.style.display   = 'none';
      }
    });
  });
}


/* ── Pill buttons (chart type toggle, visual only) ────────── */
function bindPillBtns() {
  document.querySelectorAll('.card-actions .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.card-actions')
         .querySelectorAll('.pill-btn')
         .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

/* ── Recent list (populate from summary if available) ─────── */
function populateRecentList(data) {
  const list = document.getElementById('recentList');
  if (!list) return;

  const recent = data?.recent_transactions;
  if (!recent || !recent.length) return;

  const ICONS = {
    food:          '🍔', dining: '🍔',
    transport:     '🚌', travel: '✈️',
    shopping:      '🛍️',
    entertainment: '🎬', movies: '🎬',
    health:        '💊', medical: '💊',
    utilities:     '💡', bills: '💡',
    groceries:     '🛒',
    education:     '📚',
  };

  const icon = cat => {
    const key = (cat || '').toLowerCase();
    for (const [k, v] of Object.entries(ICONS)) if (key.includes(k)) return v;
    return '💸';
  };

  list.innerHTML = recent.slice(0, 6).map(t => `
    <div class="recent-item">
      <div class="recent-icon">${icon(t.category)}</div>
      <div class="recent-info">
        <div class="recent-name">${t.name || t.description || 'Expense'}</div>
        <div class="recent-cat">${t.category || 'Uncategorised'}</div>
      </div>
      <div class="recent-amount">₹${Number(t.amount).toLocaleString('en-IN')}</div>
    </div>
  `).join('');
}

/* ── Greeting by time ─────────────────────────────────────── */
function setGreeting() {
  const el = document.querySelector('.welcome-greeting');
  if (!el) return;
  const h = new Date().getHours();
  if      (h < 12) el.textContent = 'Good morning 👋';
  else if (h < 17) el.textContent = 'Good afternoon 👋';
  else             el.textContent = 'Good evening 👋';
}

function bindNavigation() {
    console.log("Navigation ready");
}

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  bindNavigation();
  updateDate();
  setGreeting();
  const data = loadSummaryData();
  renderDashboardChart(data);
  populateRecentList(data);
  bindPillBtns();
});

