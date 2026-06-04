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

function showToast(message, duration = 2400) {
  const toast = document.getElementById('navToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

/* ── HAMBURGER toggle (mobile) ──────────────────────────────── */
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
