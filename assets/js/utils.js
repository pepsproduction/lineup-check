/**
 * utils.js — LineUp Check
 * Shared utility helpers used across all pages.
 */

/* ============================================================
   DOM Helpers
   ============================================================ */

/** Get element by ID */
function $id(id) {
  return document.getElementById(id);
}

/** Query selector */
function $qs(selector, context) {
  return (context || document).querySelector(selector);
}

/** Query selector all */
function $qsa(selector, context) {
  return Array.from((context || document).querySelectorAll(selector));
}

/** Show element */
function showEl(el) {
  if (typeof el === 'string') el = $id(el);
  if (el) el.classList.remove('hidden');
}

/** Hide element */
function hideEl(el) {
  if (typeof el === 'string') el = $id(el);
  if (el) el.classList.add('hidden');
}

/** Toggle element visibility */
function toggleEl(el, show) {
  if (typeof el === 'string') el = $id(el);
  if (!el) return;
  if (show === undefined) show = el.classList.contains('hidden');
  show ? showEl(el) : hideEl(el);
}

/* ============================================================
   Toast Notifications
   ============================================================ */

let _toastContainer = null;

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = $id('toast-container');
    if (!_toastContainer) {
      _toastContainer = document.createElement('div');
      _toastContainer.id = 'toast-container';
      document.body.appendChild(_toastContainer);
    }
  }
  return _toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration ms
 */
function showToast(message, type = 'info', duration = APP_CONFIG.TOAST_DURATION) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = _getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ============================================================
   Loading Overlay
   ============================================================ */

function showLoading(text = 'กำลังโหลด...') {
  let overlay = $id('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="spinner"></div>
      <div id="loading-text" style="font-weight:600;color:var(--text-secondary)">${escapeHtml(text)}</div>
    `;
    document.body.appendChild(overlay);
  } else {
    const txt = $id('loading-text');
    if (txt) txt.textContent = text;
    overlay.classList.remove('hidden');
  }
}

function hideLoading() {
  const overlay = $id('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

/* ============================================================
   Date & Time Utilities
   ============================================================ */

/**
 * Format Date object to YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format Date to Thai readable string
 */
function formatDateThai(dateStr) {
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const days   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const buddhistYear = d.getFullYear() + 543;
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${buddhistYear}`;
}

/**
 * Format HH:MM from Date or ISO string
 */
function formatTime(date) {
  if (!date) date = new Date();
  if (typeof date === 'string') date = new Date(date);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Format full datetime: DD/MM/YYYY HH:MM
 */
function formatDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d)) return isoString;
  const date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`;
  const time = formatTime(d);
  return `${date} ${time}`;
}

/**
 * Get today's date string YYYY-MM-DD
 */
function today() {
  return formatDate(new Date());
}

/**
 * Check if time string (HH:MM) is after late_after setting
 */
function isLate(timeStr, lateAfterStr) {
  if (!timeStr || !lateAfterStr) return false;
  return timeStr > lateAfterStr;
}

/* ============================================================
   String Utilities
   ============================================================ */

/** Escape HTML to prevent XSS */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Generate a random alphanumeric string */
function randomString(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Generate QR Token: QR-C001-S001-XXXXXX */
function generateQrToken(classNo, studentNo) {
  const classStr   = String(classNo || '000').padStart(3, '0');
  const studentStr = String(studentNo || '000').padStart(3, '0');
  return `QR-C${classStr}-S${studentStr}-${randomString(6)}`;
}

/** Truncate text */
function truncate(str, maxLen = 20) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

/** Get initials from full name */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0].slice(0, 2);
}

/* ============================================================
   LocalStorage Helpers
   ============================================================ */

function lsGet(key, defaultVal = null) {
  try {
    const val = localStorage.getItem(key);
    if (val === null) return defaultVal;
    try { return JSON.parse(val); } catch { return val; }
  } catch { return defaultVal; }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch { return false; }
}

function lsRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

/* ============================================================
   Debounce
   ============================================================ */

function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ============================================================
   Vibration / Beep
   ============================================================ */

function vibrate(pattern = [50]) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

function beep(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
    } else if (type === 'error') {
      osc.frequency.value = 220;
      gain.gain.value = 0.3;
    } else {
      osc.frequency.value = 660;
      gain.gain.value = 0.2;
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

/* ============================================================
   Modal Helpers
   ============================================================ */

function openModal(modalOverlayId) {
  const el = $id(modalOverlayId);
  if (el) {
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalOverlayId) {
  const el = $id(modalOverlayId);
  if (el) {
    el.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ============================================================
   Status Badge HTML
   ============================================================ */

function statusBadgeHtml(status) {
  const label = APP_CONFIG.STATUS_LABELS[status] || status;
  const icon  = APP_CONFIG.STATUS_ICONS[status] || '';
  return `<span class="badge badge-${status}">${icon} ${escapeHtml(label)}</span>`;
}

/* ============================================================
   CSV Parser (simple)
   ============================================================ */

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

/* ============================================================
   Connection Status Monitor
   ============================================================ */

function initConnectionMonitor() {
  const banner = $id('connection-banner');
  if (!banner) return;

  function update() {
    if (navigator.onLine) {
      banner.classList.remove('show');
    } else {
      banner.classList.add('show');
      banner.textContent = '⚠️ ไม่มีอินเทอร์เน็ต — รายการสแกนจะเก็บไว้ก่อน';
    }
  }

  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

/* ============================================================
   Role Permission Checker
   ============================================================ */

function hasRole(user, ...roles) {
  if (!user) return false;
  return roles.includes(user.role);
}

function isAdmin(user)   { return hasRole(user, APP_CONFIG.ROLES.ADMIN); }
function isTeacher(user) { return hasRole(user, APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.TEACHER); }
