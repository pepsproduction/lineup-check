/**
 * app.js — LineUp Check
 * Common page initialization: bottom nav active state,
 * connection monitor, logout handler, shared UI setup.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mark active nav item based on current page
  _initBottomNav();

  // Monitor online/offline status
  initConnectionMonitor();

  // Logout buttons
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });

  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });
});

function _initBottomNav() {
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav .nav-item, .bottom-nav .nav-scan').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.includes(currentPage)) {
      item.classList.add('active');
    }
  });
}

/**
 * Standard header rendering for logged-in pages.
 * Call this after Auth.requireLogin() resolves.
 */
function renderPageHeader(user) {
  if (!user) return;
  Auth.renderUserBadge(user);

  // School name in header if set
  const schoolEl = $id('school-name-header');
  if (schoolEl) {
    const name = lsGet(APP_CONFIG.STORAGE_KEYS.SCHOOL_NAME, APP_CONFIG.APP_NAME);
    schoolEl.textContent = name;
  }
}

/**
 * Paginated list helper — renders items into a container.
 * @param {string} containerId
 * @param {Array} items
 * @param {Function} renderFn — fn(item) => HTML string
 * @param {string} emptyTitle
 * @param {string} emptyText
 */
function renderList(containerId, items, renderFn, emptyTitle = 'ไม่มีข้อมูล', emptyText = '') {
  const container = $id(containerId);
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">${escapeHtml(emptyTitle)}</div>
        ${emptyText ? `<div class="empty-state-text">${escapeHtml(emptyText)}</div>` : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(renderFn).join('');
}
