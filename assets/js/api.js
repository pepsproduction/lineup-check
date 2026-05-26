/**
 * api.js — LineUp Check
 * Central API client for Google Apps Script Web App.
 *
 * Design Notes:
 * - Uses POST with Content-Type: text/plain to avoid CORS preflight
 * - Payload is JSON.stringify'd string in the body
 * - Apps Script reads e.postData.contents and parses JSON
 * - All requests include session_token when available
 */

const API = (() => {
  /* ---------- Internal Helpers ---------- */

  function _getApiUrl() {
    return lsGet(APP_CONFIG.STORAGE_KEYS.API_URL, '');
  }

  function _getSessionToken() {
    return lsGet(APP_CONFIG.STORAGE_KEYS.SESSION_TOKEN, '');
  }

  /**
   * Core fetch wrapper.
   * @param {Object} payload — must include `action`
   * @param {string} [overrideUrl] — optional URL override (for setup test)
   * @returns {Promise<{ok:boolean, data:any, message:string, error:string}>}
   */
  /* ---------- Cache Manager ---------- */
  const Cache = (() => {
    let _store = {};

    return {
      get(key) {
        const item = _store[key];
        if (!item) return null;
        if (Date.now() > item.expiry) {
          delete _store[key];
          return null;
        }
        return item.data;
      },
      set(key, data, ttlMs = 120000) { // TTL: 2 minutes for faster subsequent loads
        _store[key] = {
          data,
          expiry: Date.now() + ttlMs
        };
      },
      clear(prefix) {
        if (!prefix) {
          _store = {};
        } else {
          Object.keys(_store).forEach(k => {
            if (k.startsWith(prefix)) delete _store[k];
          });
        }
      }
    };
  })();

  async function _executeFetch(payload, url) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        // Use text/plain to avoid CORS preflight (no custom headers)
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `HTTP_${response.status}`,
          message: `เซิร์ฟเวอร์ตอบกลับ ${response.status} — กรุณาตรวจสอบ Apps Script URL`
        };
      }

      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        return { ok: false, error: 'INVALID_JSON', message: 'เซิร์ฟเวอร์ตอบกลับข้อมูลที่อ่านไม่ได้' };
      }

      return json;
    } catch (err) {
      // Network error — check if we should queue offline
      const isOfflineCapable = payload.action === 'scanAttendance';
      if (isOfflineCapable && !navigator.onLine) {
        return { ok: false, error: 'OFFLINE', message: 'ไม่มีอินเทอร์เน็ต — บันทึกไว้ใน Offline Queue แล้ว' };
      }
      return {
        ok: false,
        error: 'NETWORK_ERROR',
        message: 'เชื่อมต่อ API ไม่ได้ — กรุณาตรวจสอบอินเทอร์เน็ต'
      };
    }
  }

  /**
   * Core fetch wrapper with caching support.
   */
  async function _call(payload, overrideUrl = null) {
    const url = overrideUrl || _getApiUrl();

    if (!url) {
      return { ok: false, error: 'NO_API_URL', message: 'ยังไม่ได้ตั้งค่า URL ของ Apps Script กรุณาไปที่หน้าตั้งค่าก่อน' };
    }

    // Attach session token to every request
    const token = _getSessionToken();
    if (token && !payload.session_token) {
      payload.session_token = token;
    }

    const action = payload.action;

    // 1. Determine Cache Key
    let cacheKey = null;
    if (!overrideUrl) {
      if (action === 'listClasses') cacheKey = 'classes';
      else if (action === 'getSettings') cacheKey = 'settings';
      else if (action === 'listStudents') cacheKey = `students_${payload.class_id || ''}_${payload.search || ''}`;
    }

    // 2. Return Cache if available
    if (cacheKey) {
      const cached = Cache.get(cacheKey);
      if (cached) return cached;
    }

    // 3. Execute request
    const result = await _executeFetch(payload, url);

    // 4. Save Cache if successful
    if (result.ok && cacheKey) {
      Cache.set(cacheKey, result);
    }

    // 5. Invalidate Cache on modifying actions
    if (result.ok) {
      if (action === 'createClass' || action === 'updateClass') {
        Cache.clear('classes');
      } else if (action === 'createStudent' || action === 'updateStudent' || action === 'importStudents') {
        Cache.clear('students');
      } else if (action === 'updateSettings') {
        Cache.clear('settings');
      } else if (action === 'logout') {
        Cache.clear();
      }
    }

    return result;
  }

  /* ============================================================
     Public API Methods
     ============================================================ */

  return {
    /* ---------- Setup ---------- */
    ping(url) {
      return _call({ action: 'ping' }, url);
    },

    setupInit(url) {
      return _call({ action: 'setupInit' }, url);
    },

    /* ---------- Auth ---------- */
    login(username, password) {
      return _call({ action: 'login', username, password });
    },

    logout() {
      return _call({ action: 'logout' });
    },

    me() {
      return _call({ action: 'me' });
    },

    register(data) {
      return _call({ action: 'register', ...data });
    },

    /* ---------- Settings ---------- */
    getSettings() {
      return _call({ action: 'getSettings' });
    },

    updateSettings(settings) {
      return _call({ action: 'updateSettings', settings });
    },

    /* ---------- Classes ---------- */
    listClasses() {
      return _call({ action: 'listClasses' });
    },

    createClass(data) {
      return _call({ action: 'createClass', ...data });
    },

    updateClass(data) {
      return _call({ action: 'updateClass', ...data });
    },

    /* ---------- Students ---------- */
    listStudents(classId, search = '') {
      return _call({ action: 'listStudents', class_id: classId, search });
    },

    createStudent(data) {
      return _call({ action: 'createStudent', ...data });
    },

    updateStudent(data) {
      return _call({ action: 'updateStudent', ...data });
    },

    importStudents(classId, students) {
      return _call({ action: 'importStudents', class_id: classId, students });
    },

    getStudentByQr(qrToken) {
      return _call({ action: 'getStudentByQr', qr_token: qrToken });
    },

    /* ---------- Attendance ---------- */
    scanAttendance(qrToken, classId, date) {
      return _call({ action: 'scanAttendance', qr_token: qrToken, class_id: classId, date: date || today() });
    },

    updateAttendanceStatus(attendanceIdOrData, status, note) {
      if (typeof attendanceIdOrData === 'object') {
        return _call({ action: 'updateAttendanceStatus', ...attendanceIdOrData });
      }
      return _call({ action: 'updateAttendanceStatus', attendance_id: attendanceIdOrData, status, note });
    },

    /* ---------- Reports ---------- */
    getTodaySummary(classId) {
      return _call({ action: 'getTodaySummary', class_id: classId, date: today() });
    },

    getDailyReport(classId, date) {
      return _call({ action: 'getDailyReport', class_id: classId, date });
    },

    getMonthlyReport(classId, year, month) {
      return _call({ action: 'getMonthlyReport', class_id: classId, year, month });
    },

    listPendingStudents(classId, date) {
      return _call({ action: 'listPendingStudents', class_id: classId, date: date || today() });
    },

    /* ---------- User Management (admin) ---------- */
    listTeachers() {
      return _call({ action: 'listTeachers' });
    },

    createTeacher(data) {
      return _call({ action: 'createTeacher', ...data });
    },

    resetTeacherPassword(userId, newPassword) {
      return _call({ action: 'resetTeacherPassword', user_id: userId, new_password: newPassword });
    },

    updateUserStatus(userId, status) {
      return _call({ action: 'updateUserStatus', user_id: userId, status });
    },

    deleteUser(userId) {
      return _call({ action: 'deleteUser', user_id: userId });
    },

    markPendingAsAbsent(classId, date) {
      return _call({ action: 'markPendingAsAbsent', class_id: classId, date });
    },

    clearCache(prefix) {
      Cache.clear(prefix);
    },

    /* ---------- Activity Logs ---------- */
    logActivity(action, targetType, targetId, detail) {
      return _call({ action: 'logActivity', log_action: action, target_type: targetType, target_id: targetId, detail });
    },
  };
})();
