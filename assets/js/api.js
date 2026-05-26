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

    try {
      const response = await fetch(url, {
        method: 'POST',
        // Use text/plain to avoid CORS preflight (no custom headers)
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        // No credentials — Apps Script handles auth via session_token
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

    updateAttendanceStatus(attendanceId, status, note) {
      return _call({ action: 'updateAttendanceStatus', attendance_id: attendanceId, status, note });
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

    /* ---------- Activity Logs ---------- */
    logActivity(action, targetType, targetId, detail) {
      return _call({ action: 'logActivity', log_action: action, target_type: targetType, target_id: targetId, detail });
    },
  };
})();
