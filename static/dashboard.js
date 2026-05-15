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
function showToast(message, duration = 2400) {
  const toast = document.getElementById('navToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

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

/* ── Sidebar toggle (mobile) ──────────────────────────────── */
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('sidebarOverlay');
const hamburger = document.getElementById('hamburgerBtn');

function openSidebar() {
  sidebar?.classList.add('open');
  overlay?.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar?.classList.remove('open');
  overlay?.classList.remove('active');
  document.body.style.overflow = '';
}

hamburger?.addEventListener('click', () => {
  sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
});

overlay?.addEventListener('click', closeSidebar);

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
function renderChart(data) {
  const ctx = document.getElementById('expenseChart');
  if (!ctx) return;

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded — skipping chart render.');
    ctx.closest('.chart-wrapper').innerHTML =
      '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:40px 20px;">Chart.js not loaded.</p>';
    return;
  }

  const categories = data?.categories || {};
  const labels  = Object.keys(categories);
  const values  = Object.values(categories);

  if (!labels.length) {
    ctx.closest('.chart-wrapper').innerHTML =
      '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:40px 20px;">No expense data yet.</p>';
    return;
  }

  const PALETTE = [
    '#e8a84c','#4ec9b0','#a78bfa','#f87171',
    '#60a5fa','#fb923c','#34d399','#f472b6',
  ];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: PALETTE.slice(0, labels.length),
        borderColor:     'transparent',
        borderWidth:     0,
        hoverOffset:     6,
      }],
    },
    options: {
      cutout: '68%',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#8b90a8',
            font:  { family: "'DM Sans', sans-serif", size: 11 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 8,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const val   = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total ? ((val / total) * 100).toFixed(1) : 0;
              return ` ₹${val.toLocaleString('en-IN')}  (${pct}%)`;
            },
          },
          backgroundColor: '#1e2130',
          borderColor:     'rgba(255,255,255,0.08)',
          borderWidth:     1,
          titleColor:      '#f0f2f8',
          bodyColor:       '#8b90a8',
          padding:         10,
        },
      },
    },
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
  renderChart(data);
  populateRecentList(data);
  bindPillBtns();
});