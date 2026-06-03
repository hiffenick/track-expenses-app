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
function renderDashboardChart(data) {
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
  renderDashboardChart(data);
  populateRecentList(data);
  bindPillBtns();
});

/* ── Search ───────────────────────────────────────────────── */
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