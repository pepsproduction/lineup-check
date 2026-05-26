/**
 * auth.js — LineUp Check
 * Authentication guard and session management.
 */

const Auth = (() => {
  /* ============================================================
     Internal State
     ============================================================ */

  let _currentUser = null;

  /* ============================================================
     Session Management
     ============================================================ */

  function saveSession(token, userInfo) {
    lsSet(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, token);
    lsSet(APP_CONFIG.STORAGE_KEYS.USER_INFO, userInfo);
    _currentUser = userInfo;
  }

  function clearSession() {
    lsRemove(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
    lsRemove(APP_CONFIG.STORAGE_KEYS.USER_INFO);
    _currentUser = null;
  }

  function getSessionToken() {
    return lsGet(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, null);
  }

  function getCachedUser() {
    if (_currentUser) return _currentUser;
    _currentUser = lsGet(APP_CONFIG.STORAGE_KEYS.USER_INFO, null);
    return _currentUser;
  }

  function isLoggedIn() {
    return !!getSessionToken();
  }

  /* ============================================================
     Guard — redirect if not logged in
     Call at top of every protected page
     ============================================================ */

  async function requireLogin(allowedRoles = []) {
    // 1. Check if API URL is configured
    const apiUrl = lsGet(APP_CONFIG.STORAGE_KEYS.API_URL, '') || APP_CONFIG.DEFAULT_API_URL;
    if (!apiUrl) {
      window.location.href = 'setup.html';
      return null;
    }

    // 2. Check session token exists
    const token = getSessionToken();
    if (!token) {
      window.location.href = 'login.html';
      return null;
    }

    // 3. Use cached user info (fast path)
    let user = getCachedUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }

    // 4. Check role permission on cached user
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      showToast('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'error');
      window.location.href = 'dashboard.html';
      return null;
    }

    // 5. Verify session with server in the background (non-blocking)
    API.me().then(res => {
      if (res.ok && res.data) {
        lsSet(APP_CONFIG.STORAGE_KEYS.USER_INFO, res.data);
        _currentUser = res.data;
      } else if (res.error === 'SESSION_EXPIRED' || res.error === 'INVALID_SESSION') {
        clearSession();
        window.location.href = 'login.html?reason=expired';
      }
    }).catch(() => {
      // Ignore background network errors
    });

    return user;
  }

  /* ============================================================
     Login
     ============================================================ */

  async function login(username, password) {
    const res = await API.login(username, password);
    if (res.ok && res.data) {
      saveSession(res.data.session_token, res.data.user);
      return { ok: true, user: res.data.user };
    }
    return { ok: false, message: res.message || 'เข้าสู่ระบบไม่สำเร็จ' };
  }

  /* ============================================================
     Logout
     ============================================================ */

  async function logout() {
    try {
      await API.logout();
    } catch {}
    clearSession();
    window.location.href = 'login.html';
  }

  /* ============================================================
     Role Checks (convenience)
     ============================================================ */

  function canManageSystem(user) {
    return user && user.role === APP_CONFIG.ROLES.ADMIN;
  }

  function canManageStudents(user) {
    return user && (user.role === APP_CONFIG.ROLES.ADMIN || user.role === APP_CONFIG.ROLES.TEACHER);
  }

  function canScan(user) {
    return user && [APP_CONFIG.ROLES.ADMIN, APP_CONFIG.ROLES.TEACHER, APP_CONFIG.ROLES.ASSISTANT].includes(user.role);
  }

  function canDeleteStudent(user) {
    return user && (user.role === APP_CONFIG.ROLES.ADMIN || user.role === APP_CONFIG.ROLES.TEACHER);
  }

  /* ============================================================
     Render Current User Info in Header
     ============================================================ */

  function renderUserBadge(user) {
    const el = $id('user-badge');
    if (!el || !user) return;

    const roleLabel = {
      admin:     'ผู้ดูแลระบบ',
      teacher:   'ครู',
      assistant: 'ผู้ช่วย',
    };

    el.innerHTML = `
      <div style="font-weight:700;font-size:14px">${escapeHtml(user.full_name || user.username)}</div>
      <div style="font-size:12px;opacity:0.8">${escapeHtml(roleLabel[user.role] || user.role)}</div>
    `;
  }

  /* ============================================================
     Public Interface
     ============================================================ */
  return {
    login,
    logout,
    requireLogin,
    saveSession,
    clearSession,
    getSessionToken,
    getCachedUser,
    isLoggedIn,
    canManageSystem,
    canManageStudents,
    canScan,
    canDeleteStudent,
    renderUserBadge,
  };
})();
