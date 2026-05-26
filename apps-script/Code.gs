/**
 * LineUp Check — Google Apps Script Backend
 * Code.gs
 *
 * ติดตั้ง:
 * 1. เปิด Google Sheet ใหม่
 * 2. Extensions → Apps Script
 * 3. วางโค้ดนี้ทั้งหมด แล้วแก้ SPREADSHEET_ID
 * 4. Deploy → New deployment → Web App → Anyone → Deploy
 * 5. Copy URL ไปใส่ในหน้า Setup ของ LineUp Check
 */

// ============================================================
// CONFIGURATION — แก้ไขตรงนี้
// ============================================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // <-- ใส่ ID ของ Google Sheet ที่สร้าง

// เวลาเริ่มนับว่า "สาย" (format HH:MM) — สามารถเปลี่ยนได้ผ่าน Settings
const DEFAULT_LATE_AFTER = '08:00';

// Session หมดอายุ (ชั่วโมง)
const SESSION_EXPIRE_HOURS = 24;

// ============================================================
// SHEET NAMES
// ============================================================
const SHEETS = {
  USERS:       'Users',
  CLASSES:     'Classes',
  CLASS_MEMBERS: 'ClassMembers',
  STUDENTS:    'Students',
  ATTENDANCE:  'Attendance',
  SESSIONS:    'Sessions',
  SETTINGS:    'Settings',
  ACTIVITY_LOGS: 'ActivityLogs',
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================

function doPost(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  };

  try {
    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch {
      return makeResponse({ ok: false, error: 'INVALID_JSON', message: 'ส่งข้อมูลมาผิดรูปแบบ' });
    }

    const action = payload.action;
    if (!action) {
      return makeResponse({ ok: false, error: 'NO_ACTION', message: 'ไม่ระบุ action' });
    }

    // ─── Public actions (no login required) ───
    if (action === 'ping')       return handlePing();
    if (action === 'setupInit')  return handleSetupInit();
    if (action === 'login')      return handleLogin(payload);
    if (action === 'register')   return handleRegister(payload);

    // ─── Protected actions (require valid session) ───
    const session = validateSession(payload.session_token);
    if (!session) {
      return makeResponse({ ok: false, error: 'INVALID_SESSION', message: 'Session ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }

    const user = getUserById(session.user_id);
    if (!user || user.status !== 'active') {
      return makeResponse({ ok: false, error: 'USER_INACTIVE', message: 'บัญชีผู้ใช้ถูกระงับ' });
    }

    switch (action) {
      // Auth
      case 'logout':                return handleLogout(payload.session_token);
      case 'me':                    return makeResponse({ ok: true, data: safeUser(user) });

      // Settings
      case 'getSettings':           return handleGetSettings(user);
      case 'updateSettings':        return handleUpdateSettings(user, payload);

      // Classes
      case 'listClasses':           return handleListClasses(user);
      case 'createClass':           return handleCreateClass(user, payload);
      case 'updateClass':           return handleUpdateClass(user, payload);

      // Students
      case 'listStudents':          return handleListStudents(user, payload);
      case 'createStudent':         return handleCreateStudent(user, payload);
      case 'updateStudent':         return handleUpdateStudent(user, payload);
      case 'importStudents':        return handleImportStudents(user, payload);
      case 'getStudentByQr':        return handleGetStudentByQr(user, payload);

      // Attendance
      case 'scanAttendance':        return handleScanAttendance(user, payload);
      case 'updateAttendanceStatus': return handleUpdateAttendanceStatus(user, payload);

      // Reports
      case 'getTodaySummary':       return handleGetTodaySummary(user, payload);
      case 'getDailyReport':        return handleGetDailyReport(user, payload);
      case 'getMonthlyReport':      return handleGetMonthlyReport(user, payload);
      case 'listPendingStudents':   return handleListPendingStudents(user, payload);

      // User Management
      case 'listTeachers':          return handleListTeachers(user);
      case 'createTeacher':         return handleCreateTeacher(user, payload);
      case 'resetTeacherPassword':  return handleResetTeacherPassword(user, payload);
      case 'updateUserStatus':      return handleUpdateUserStatus(user, payload);
      case 'deleteUser':            return handleDeleteUser(user, payload);

      // Logs
      case 'logActivity':           return handleLogActivity(user, payload);

      default:
        return makeResponse({ ok: false, error: 'UNKNOWN_ACTION', message: `ไม่รู้จัก action: ${action}` });
    }
  } catch (err) {
    console.error('doPost error:', err);
    return makeResponse({ ok: false, error: 'SERVER_ERROR', message: `เกิดข้อผิดพลาดในเซิร์ฟเวอร์: ${err.message}` });
  }
}

function doGet(e) {
  return makeResponse({ ok: true, message: 'LineUp Check API ทำงานปกติ' });
}

// ============================================================
// RESPONSE HELPER
// ============================================================

function makeResponse(obj) {
  const body = JSON.stringify(obj);
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function ok(data, message) {
  return makeResponse({ ok: true, data: data || null, message: message || 'สำเร็จ' });
}

function err(errorCode, message) {
  return makeResponse({ ok: false, error: errorCode, message: message });
}

// ============================================================
// SPREADSHEET HELPERS
// ============================================================

function getSpreadsheetId(idOrUrl) {
  if (!idOrUrl) return '';
  if (idOrUrl.indexOf('docs.google.com/spreadsheets') !== -1) {
    const matches = idOrUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (matches && matches[1]) {
      return matches[1];
    }
  }
  return idOrUrl.trim();
}

function getSheet(name) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId(SPREADSHEET_ID));
  return ss.getSheetByName(name);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(getSpreadsheetId(SPREADSHEET_ID));
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ''; });
    return obj;
  });
}

function appendRow(sheet, obj, headers) {
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function findRowIndex(sheet, colName, value) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return -1;
  const headers = data[0];
  const colIdx = headers.indexOf(colName);
  if (colIdx < 0) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(value)) return i + 1; // 1-indexed row
  }
  return -1;
}

function updateRowByIndex(sheet, rowIndex, colName, value) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIdx = headers.indexOf(colName);
  if (colIdx < 0) return;
  sheet.getRange(rowIndex, colIdx + 1).setValue(value);
}

function updateRowFields(sheet, rowIndex, updates) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Object.entries(updates).forEach(([colName, value]) => {
    const colIdx = headers.indexOf(colName);
    if (colIdx >= 0) sheet.getRange(rowIndex, colIdx + 1).setValue(value);
  });
}

// ============================================================
// ID GENERATORS
// ============================================================

function generateId(prefix) {
  return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 12).toUpperCase();
}

function generateToken() {
  return Utilities.getUuid().replace(/-/g, '');
}

function generateQrToken(classSeq, studentSeq) {
  const cls = String(classSeq || '000').padStart(3, '0');
  const stu = String(studentSeq || '000').padStart(3, '0');
  const rnd = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `QR-C${cls}-S${stu}-${rnd}`;
}

// ============================================================
// PASSWORD HASHING
// ============================================================

function hashPassword(password, salt) {
  const combined = password + salt;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    combined, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function verifyPassword(password, hash, salt) {
  return hashPassword(password, salt) === hash;
}

// ============================================================
// SETUP
// ============================================================

function handlePing() {
  return ok({ version: '1.1.0', time: new Date().toISOString() }, 'pong');
}

function handleSetupInit() {
  try {
    // Create all sheets
    const sheetsConfig = {
      [SHEETS.USERS]:    ['user_id','full_name','username','password_hash','password_salt','role','status','created_at','last_login'],
      [SHEETS.CLASSES]:  ['class_id','class_name','owner_user_id','level','room','active','created_at'],
      [SHEETS.CLASS_MEMBERS]: ['class_id','user_id','permission','created_at'],
      [SHEETS.STUDENTS]: ['student_id','class_id','student_no','student_code','first_name','last_name','qr_token','active','created_at'],
      [SHEETS.ATTENDANCE]: ['attendance_id','date','class_id','student_id','status','scan_time','checked_by_user_id','method','note','created_at'],
      [SHEETS.SESSIONS]: ['session_token','user_id','created_at','expires_at','device_name','active'],
      [SHEETS.SETTINGS]: ['key','value'],
      [SHEETS.ACTIVITY_LOGS]: ['log_id','user_id','action','target_type','target_id','detail','created_at'],
    };

    Object.entries(sheetsConfig).forEach(([name, headers]) => {
      getOrCreateSheet(name, headers);
    });

    // Default settings
    const settingsSheet = getSheet(SHEETS.SETTINGS);
    const existingSettings = sheetToObjects(settingsSheet);
    const existingKeys = existingSettings.map(s => s.key);

    if (!existingKeys.includes('school_name')) {
      settingsSheet.appendRow(['school_name', 'โรงเรียนตัวอย่าง']);
    }
    if (!existingKeys.includes('late_after')) {
      settingsSheet.appendRow(['late_after', DEFAULT_LATE_AFTER]);
    }

    // Create admin if no users exist
    const usersSheet = getSheet(SHEETS.USERS);
    const existingUsers = sheetToObjects(usersSheet);
    let adminInfo = null;

    if (existingUsers.length === 0) {
      const salt     = generateSalt();
      const password = 'admin1234';
      const hash     = hashPassword(password, salt);
      const userId   = generateId('U');
      const now      = new Date().toISOString();

      usersSheet.appendRow([userId, 'ผู้ดูแลระบบ', 'admin', hash, salt, 'admin', 'active', now, '']);
      adminInfo = { admin_username: 'admin', admin_password: password };
    }

    return ok(adminInfo, 'Setup สำเร็จ! สร้าง Sheet และ Admin account แล้ว');
  } catch (e) {
    return err('SETUP_ERROR', 'Setup ล้มเหลว: ' + e.message);
  }
}

// ============================================================
// AUTH
// ============================================================

function handleLogin(payload) {
  const { username, password } = payload;
  if (!username || !password) {
    return err('MISSING_FIELDS', 'กรุณาใส่ชื่อผู้ใช้และรหัสผ่าน');
  }

  const sheet = getSheet(SHEETS.USERS);
  if (!sheet) return err('SETUP_REQUIRED', 'ยังไม่ได้ Setup ระบบ กรุณากดปุ่ม Setup Init ก่อน');

  const users = sheetToObjects(sheet);
  const user  = users.find(u => u.username === username);

  if (!user) return err('INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  if (user.status === 'pending') return err('USER_PENDING', 'บัญชีผู้ใช้ของคุณอยู่ระหว่างการรออนุมัติจากผู้ดูแลระบบ');
  if (user.status !== 'active') return err('USER_INACTIVE', 'บัญชีผู้ใช้ของคุณถูกระงับการใช้งาน');

  if (!verifyPassword(password, user.password_hash, user.password_salt)) {
    return err('INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  // Create session
  const sessionToken = generateToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_EXPIRE_HOURS * 3600 * 1000);

  const sessSheet = getSheet(SHEETS.SESSIONS);
  sessSheet.appendRow([
    sessionToken,
    user.user_id,
    now.toISOString(),
    expires.toISOString(),
    payload.device_name || 'unknown',
    'true',
  ]);

  // Update last_login
  const userRowIdx = findRowIndex(sheet, 'user_id', user.user_id);
  if (userRowIdx > 0) {
    updateRowByIndex(sheet, userRowIdx, 'last_login', now.toISOString());
  }

  logActivity_(user.user_id, 'login', 'user', user.user_id, '');

  return ok({
    session_token: sessionToken,
    user: safeUser(user),
  }, 'เข้าสู่ระบบสำเร็จ');
}

function handleLogout(token) {
  if (!token) return err('NO_TOKEN', 'ไม่มี session token');
  const sessSheet = getSheet(SHEETS.SESSIONS);
  const rowIdx = findRowIndex(sessSheet, 'session_token', token);
  if (rowIdx > 0) {
    updateRowByIndex(sessSheet, rowIdx, 'active', 'false');
  }
  return ok(null, 'ออกจากระบบสำเร็จ');
}

function validateSession(token) {
  if (!token) return null;
  const sheet = getSheet(SHEETS.SESSIONS);
  if (!sheet) return null;

  const sessions = sheetToObjects(sheet);
  const sess = sessions.find(s => s.session_token === token && s.active === 'true');
  if (!sess) return null;

  const expires = new Date(sess.expires_at);
  if (new Date() > expires) return null;

  return sess;
}

function getUserById(userId) {
  const sheet = getSheet(SHEETS.USERS);
  if (!sheet) return null;
  const users = sheetToObjects(sheet);
  return users.find(u => u.user_id === userId) || null;
}

function safeUser(user) {
  // Never return password_hash or password_salt
  const { password_hash, password_salt, ...safe } = user;
  return safe;
}

// ============================================================
// SETTINGS
// ============================================================

function handleGetSettings(user) {
  const sheet = getSheet(SHEETS.SETTINGS);
  if (!sheet) return err('NO_SHEET', 'ไม่พบ Settings sheet');

  const rows = sheetToObjects(sheet);
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return ok(settings);
}

function handleUpdateSettings(user, payload) {
  if (user.role !== 'admin') return err('FORBIDDEN', 'ไม่มีสิทธิ์แก้ไขตั้งค่าระบบ');

  const sheet = getSheet(SHEETS.SETTINGS);
  const updates = payload.settings || {};

  Object.entries(updates).forEach(([key, value]) => {
    const rowIdx = findRowIndex(sheet, 'key', key);
    if (rowIdx > 0) {
      updateRowByIndex(sheet, rowIdx, 'value', value);
    } else {
      sheet.appendRow([key, value]);
    }
  });

  logActivity_(user.user_id, 'updateSettings', 'settings', '', JSON.stringify(updates));
  return ok(null, 'บันทึกตั้งค่าสำเร็จ');
}

function getSetting(key) {
  const sheet = getSheet(SHEETS.SETTINGS);
  if (!sheet) return null;
  const rows = sheetToObjects(sheet);
  const row  = rows.find(r => r.key === key);
  return row ? row.value : null;
}

// ============================================================
// CLASSES
// ============================================================

function handleListClasses(user) {
  const sheet = getSheet(SHEETS.CLASSES);
  if (!sheet) return ok([]);

  let classes = sheetToObjects(sheet).filter(c => c.active !== '0' && c.active !== 'false' || user.role === 'admin');

  // Teacher sees only their classes or assigned classes
  if (user.role === 'teacher') {
    const memberSheet = getSheet(SHEETS.CLASS_MEMBERS);
    const members = sheetToObjects(memberSheet || null) || [];
    const assignedIds = members.filter(m => m.user_id === user.user_id).map(m => m.class_id);
    classes = classes.filter(c => c.owner_user_id === user.user_id || assignedIds.includes(c.class_id));
  }

  return ok(classes);
}

function handleCreateClass(user, payload) {
  if (user.role === 'assistant') return err('FORBIDDEN', 'ไม่มีสิทธิ์สร้างห้องเรียน');

  const sheet  = getOrCreateSheet(SHEETS.CLASSES, ['class_id','class_name','owner_user_id','level','room','active','created_at']);
  const classId = generateId('CLS');
  const headers = ['class_id','class_name','owner_user_id','level','room','active','created_at'];

  appendRow(sheet, {
    class_id: classId,
    class_name: payload.class_name || '',
    owner_user_id: payload.owner_user_id || user.user_id,
    level: payload.level || '',
    room: payload.room || '',
    active: '1',
    created_at: new Date().toISOString(),
  }, headers);

  logActivity_(user.user_id, 'createClass', 'class', classId, payload.class_name);
  return ok({ class_id: classId }, 'สร้างห้องเรียนสำเร็จ');
}

function handleUpdateClass(user, payload) {
  if (user.role === 'assistant') return err('FORBIDDEN', 'ไม่มีสิทธิ์แก้ไขห้องเรียน');

  const sheet = getSheet(SHEETS.CLASSES);
  if (!sheet) return err('NOT_FOUND', 'ไม่พบข้อมูลห้องเรียน');

  const rowIdx = findRowIndex(sheet, 'class_id', payload.class_id);
  if (rowIdx < 0) return err('NOT_FOUND', 'ไม่พบห้องเรียนนี้');

  updateRowFields(sheet, rowIdx, {
    class_name:    payload.class_name    || '',
    owner_user_id: payload.owner_user_id || '',
    level:         payload.level         || '',
    room:          payload.room          || '',
    active:        payload.active        !== undefined ? String(payload.active) : '1',
  });

  logActivity_(user.user_id, 'updateClass', 'class', payload.class_id, payload.class_name);
  return ok(null, 'แก้ไขห้องเรียนสำเร็จ');
}

// ============================================================
// STUDENTS
// ============================================================

function handleListStudents(user, payload) {
  const sheet = getSheet(SHEETS.STUDENTS);
  if (!sheet) return ok([]);

  let students = sheetToObjects(sheet);

  // Filter by class
  if (payload.class_id) {
    students = students.filter(s => s.class_id === payload.class_id);
  }

  // Filter by class ownership for teacher
  if (user.role === 'teacher') {
    const classes = sheetToObjects(getSheet(SHEETS.CLASSES) || null) || [];
    const memberSheet = getSheet(SHEETS.CLASS_MEMBERS);
    const members = memberSheet ? sheetToObjects(memberSheet) : [];
    const assignedIds = members.filter(m => m.user_id === user.user_id).map(m => m.class_id);
    const myClassIds  = classes.filter(c => c.owner_user_id === user.user_id || assignedIds.includes(c.class_id)).map(c => c.class_id);
    students = students.filter(s => myClassIds.includes(s.class_id));
  }

  // Search
  if (payload.search) {
    const q = payload.search.toLowerCase();
    students = students.filter(s =>
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)  ||
      s.student_no.includes(q)               ||
      s.student_code.toLowerCase().includes(q)
    );
  }

  // Sort by student_no
  students.sort((a, b) => parseInt(a.student_no || 9999) - parseInt(b.student_no || 9999));

  return ok(students);
}

function handleCreateStudent(user, payload) {
  if (user.role === 'assistant') return err('FORBIDDEN', 'ไม่มีสิทธิ์เพิ่มนักเรียน');
  if (!payload.class_id || !payload.first_name || !payload.last_name) {
    return err('MISSING_FIELDS', 'กรุณากรอกข้อมูลที่จำเป็น');
  }

  const sheet = getOrCreateSheet(SHEETS.STUDENTS, [
    'student_id','class_id','student_no','student_code','first_name','last_name','qr_token','active','created_at'
  ]);

  const studentId = generateId('STU');
  const qrToken   = generateQrToken(payload.class_id.slice(-3), payload.student_no);
  const headers   = ['student_id','class_id','student_no','student_code','first_name','last_name','qr_token','active','created_at'];

  appendRow(sheet, {
    student_id:   studentId,
    class_id:     payload.class_id,
    student_no:   payload.student_no   || '',
    student_code: payload.student_code || '',
    first_name:   payload.first_name,
    last_name:    payload.last_name,
    qr_token:     qrToken,
    active:       '1',
    created_at:   new Date().toISOString(),
  }, headers);

  logActivity_(user.user_id, 'createStudent', 'student', studentId, `${payload.first_name} ${payload.last_name}`);
  return ok({ student_id: studentId, qr_token: qrToken }, 'เพิ่มนักเรียนสำเร็จ');
}

function handleUpdateStudent(user, payload) {
  if (user.role === 'assistant') return err('FORBIDDEN', 'ไม่มีสิทธิ์แก้ไขนักเรียน');

  const sheet = getSheet(SHEETS.STUDENTS);
  if (!sheet) return err('NOT_FOUND', 'ไม่พบข้อมูลนักเรียน');

  const rowIdx = findRowIndex(sheet, 'student_id', payload.student_id);
  if (rowIdx < 0) return err('NOT_FOUND', 'ไม่พบนักเรียนนี้');

  const updates = {};
  if (payload.class_id)     updates.class_id     = payload.class_id;
  if (payload.student_no)   updates.student_no   = payload.student_no;
  if (payload.student_code) updates.student_code = payload.student_code;
  if (payload.first_name)   updates.first_name   = payload.first_name;
  if (payload.last_name)    updates.last_name     = payload.last_name;
  if (payload.active !== undefined) updates.active = String(payload.active);

  updateRowFields(sheet, rowIdx, updates);
  return ok(null, 'แก้ไขนักเรียนสำเร็จ');
}

function handleImportStudents(user, payload) {
  if (user.role === 'assistant') return err('FORBIDDEN', 'ไม่มีสิทธิ์ Import นักเรียน');
  if (!payload.class_id || !payload.students || !payload.students.length) {
    return err('MISSING_FIELDS', 'ข้อมูลไม่ครบถ้วน');
  }

  const sheet = getOrCreateSheet(SHEETS.STUDENTS, [
    'student_id','class_id','student_no','student_code','first_name','last_name','qr_token','active','created_at'
  ]);

  const headers = ['student_id','class_id','student_no','student_code','first_name','last_name','qr_token','active','created_at'];
  let imported  = 0;

  payload.students.forEach((s, idx) => {
    if (!s.first_name && !s.last_name) return;
    const studentId = generateId('STU');
    const qrToken   = generateQrToken(payload.class_id.slice(-3), s.student_no || (idx + 1));

    appendRow(sheet, {
      student_id:   studentId,
      class_id:     payload.class_id,
      student_no:   s.student_no   || String(idx + 1),
      student_code: s.student_code || '',
      first_name:   s.first_name   || '',
      last_name:    s.last_name    || '',
      qr_token:     qrToken,
      active:       '1',
      created_at:   new Date().toISOString(),
    }, headers);

    imported++;
  });

  logActivity_(user.user_id, 'importStudents', 'class', payload.class_id, `Imported ${imported} students`);
  return ok({ imported }, `นำเข้านักเรียน ${imported} คนสำเร็จ`);
}

function handleGetStudentByQr(user, payload) {
  if (!payload.qr_token) return err('MISSING_FIELDS', 'ไม่ระบุ qr_token');

  const sheet = getSheet(SHEETS.STUDENTS);
  if (!sheet) return err('NOT_FOUND', 'ไม่พบข้อมูล');

  const students = sheetToObjects(sheet);
  const student  = students.find(s => s.qr_token === payload.qr_token && s.active !== '0');
  if (!student) return err('NOT_FOUND', 'ไม่พบนักเรียนที่มี QR นี้');

  return ok(student);
}

// ============================================================
// ATTENDANCE
// ============================================================

function handleScanAttendance(user, payload) {
  const { qr_token, class_id, date } = payload;
  if (!qr_token || !class_id) return err('MISSING_FIELDS', 'ข้อมูลไม่ครบ');

  const scanDate = date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const scanTime = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'HH:mm');

  // Find student
  const studSheet = getSheet(SHEETS.STUDENTS);
  if (!studSheet) return err('NOT_FOUND', 'ไม่พบ Students sheet');

  const students = sheetToObjects(studSheet);
  const student  = students.find(s => s.qr_token === qr_token && s.active !== '0');
  if (!student) return err('INVALID_QR', 'ไม่พบนักเรียนที่ใช้ QR นี้');

  // Verify class match
  if (student.class_id !== class_id) {
    return err('WRONG_CLASS', `QR นี้ไม่ใช่ของห้องที่เลือก (ห้องของ QR: ${student.class_id})`);
  }

  // Check duplicate scan today
  const attSheet = getOrCreateSheet(SHEETS.ATTENDANCE, [
    'attendance_id','date','class_id','student_id','status','scan_time','checked_by_user_id','method','note','created_at'
  ]);
  const existingAtt = sheetToObjects(attSheet);
  const duplicate = existingAtt.find(a => a.student_id === student.student_id && a.date === scanDate && a.status !== 'pending');
  if (duplicate) {
    // Get class name for response
    const classSheet = getSheet(SHEETS.CLASSES);
    const classes = sheetToObjects(classSheet || null) || [];
    const cls = classes.find(c => c.class_id === class_id);

    return makeResponse({
      ok: false,
      error: 'ALREADY_SCANNED',
      message: `${student.first_name} ${student.last_name} สแกนแล้วเมื่อ ${duplicate.scan_time} น.`,
      data: {
        ...student,
        attendance_id: duplicate.attendance_id,
        scan_time: duplicate.scan_time,
        status: duplicate.status,
        class_name: cls ? cls.class_name : '',
        first_name: student.first_name,
        last_name:  student.last_name,
      },
    });
  }

  // Determine status based on late_after
  const lateAfter = getSetting('late_after') || DEFAULT_LATE_AFTER;
  const status = scanTime > lateAfter ? 'late' : 'present';

  // Record attendance
  const attendanceId = generateId('ATT');
  const headers = ['attendance_id','date','class_id','student_id','status','scan_time','checked_by_user_id','method','note','created_at'];

  appendRow(attSheet, {
    attendance_id:      attendanceId,
    date:               scanDate,
    class_id:           class_id,
    student_id:         student.student_id,
    status:             status,
    scan_time:          scanTime,
    checked_by_user_id: user.user_id,
    method:             'qr',
    note:               '',
    created_at:         new Date().toISOString(),
  }, headers);

  // Get class name
  const classSheet = getSheet(SHEETS.CLASSES);
  const classes = sheetToObjects(classSheet || null) || [];
  const cls = classes.find(c => c.class_id === class_id);

  logActivity_(user.user_id, 'scan', 'student', student.student_id, `${student.first_name} ${status}`);

  return ok({
    attendance_id: attendanceId,
    student_id:    student.student_id,
    first_name:    student.first_name,
    last_name:     student.last_name,
    student_no:    student.student_no,
    class_name:    cls ? cls.class_name : '',
    status,
    scan_time:     scanTime,
    date:          scanDate,
  }, status === 'late' ? 'สาย' : 'มา');
}

function handleUpdateAttendanceStatus(user, payload) {
  const { attendance_id, status, note } = payload;
  if (!attendance_id || !status) return err('MISSING_FIELDS', 'ข้อมูลไม่ครบ');

  const validStatuses = ['present', 'late', 'leave', 'absent', 'pending'];
  if (!validStatuses.includes(status)) return err('INVALID_STATUS', 'สถานะไม่ถูกต้อง');

  const sheet = getSheet(SHEETS.ATTENDANCE);
  if (!sheet) return err('NOT_FOUND', 'ไม่พบ Attendance sheet');

  const rowIdx = findRowIndex(sheet, 'attendance_id', attendance_id);
  if (rowIdx < 0) return err('NOT_FOUND', 'ไม่พบรายการนี้');

  updateRowFields(sheet, rowIdx, {
    status: status,
    note:   note || '',
    checked_by_user_id: user.user_id,
  });

  logActivity_(user.user_id, 'updateStatus', 'attendance', attendance_id, status);
  return ok(null, 'อัปเดตสถานะสำเร็จ');
}

// ============================================================
// REPORTS
// ============================================================

function handleGetTodaySummary(user, payload) {
  const date = payload.date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const classId = payload.class_id || '';

  const studSheet = getSheet(SHEETS.STUDENTS);
  const attSheet  = getSheet(SHEETS.ATTENDANCE);
  if (!studSheet) return ok({ summary: { present:0, late:0, leave:0, absent:0, pending:0, total:0 } });

  let students = sheetToObjects(studSheet).filter(s => s.active !== '0' && s.active !== 'false');
  if (classId) students = students.filter(s => s.class_id === classId);

  // Apply teacher filter
  if (user.role === 'teacher') {
    const classes = sheetToObjects(getSheet(SHEETS.CLASSES) || null) || [];
    const myClassIds = classes.filter(c => c.owner_user_id === user.user_id).map(c => c.class_id);
    students = students.filter(s => myClassIds.includes(s.class_id));
  }

  const attendance = attSheet ? sheetToObjects(attSheet).filter(a => a.date === date) : [];
  const attMap = {};
  attendance.forEach(a => { attMap[a.student_id] = a.status; });

  const summary = { present: 0, late: 0, leave: 0, absent: 0, pending: 0, total: students.length };
  students.forEach(s => {
    const status = attMap[s.student_id] || 'pending';
    if (summary[status] !== undefined) summary[status]++;
    else summary.pending++;
  });

  return ok({ summary });
}

function handleGetDailyReport(user, payload) {
  const { class_id, date } = payload;
  if (!class_id || !date) return err('MISSING_FIELDS', 'ข้อมูลไม่ครบ');

  const studSheet = getSheet(SHEETS.STUDENTS);
  const attSheet  = getSheet(SHEETS.ATTENDANCE);

  let students = sheetToObjects(studSheet || null).filter(s => s.class_id === class_id && s.active !== '0');
  students.sort((a, b) => parseInt(a.student_no||9999) - parseInt(b.student_no||9999));

  const attendance = attSheet
    ? sheetToObjects(attSheet).filter(a => a.class_id === class_id && a.date === date)
    : [];
  const attMap = {};
  attendance.forEach(a => { attMap[a.student_id] = a; });

  const summary = { present: 0, late: 0, leave: 0, absent: 0, pending: 0, total: students.length };
  const rows = students.map(s => {
    const att = attMap[s.student_id];
    const status = att ? att.status : 'pending';
    summary[status] = (summary[status] || 0) + 1;
    return {
      ...s,
      status,
      scan_time:      att ? att.scan_time : '',
      attendance_id:  att ? att.attendance_id : '',
      note:           att ? att.note : '',
      method:         att ? att.method : '',
    };
  });

  return ok({ summary, students: rows, date, class_id });
}

function handleGetMonthlyReport(user, payload) {
  const { class_id, year, month } = payload;
  if (!class_id || !year || !month) return err('MISSING_FIELDS', 'ข้อมูลไม่ครบ');

  const studSheet = getSheet(SHEETS.STUDENTS);
  const attSheet  = getSheet(SHEETS.ATTENDANCE);

  let students = sheetToObjects(studSheet || null).filter(s => s.class_id === class_id && s.active !== '0');
  students.sort((a, b) => parseInt(a.student_no||9999) - parseInt(b.student_no||9999));

  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const attendance = attSheet
    ? sheetToObjects(attSheet).filter(a => a.class_id === class_id && a.date.startsWith(monthPrefix))
    : [];

  const rows = students.map(s => {
    const sAtt = attendance.filter(a => a.student_id === s.student_id);
    const counts = { present: 0, late: 0, leave: 0, absent: 0, pending: 0 };
    sAtt.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
    return { ...s, ...counts };
  });

  return ok({ rows, year, month, class_id });
}

function handleListPendingStudents(user, payload) {
  const { class_id, date } = payload;
  if (!class_id) return err('MISSING_FIELDS', 'ไม่ระบุห้องเรียน');

  const scanDate = date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  const studSheet = getSheet(SHEETS.STUDENTS);
  const attSheet  = getSheet(SHEETS.ATTENDANCE);

  let students = sheetToObjects(studSheet || null).filter(s => s.class_id === class_id && s.active !== '0');
  students.sort((a, b) => parseInt(a.student_no||9999) - parseInt(b.student_no||9999));

  const attendance = attSheet
    ? sheetToObjects(attSheet).filter(a => a.class_id === class_id && a.date === scanDate && a.status !== 'pending')
    : [];
  const checkedIds = new Set(attendance.map(a => a.student_id));

  const pending = students.filter(s => !checkedIds.has(s.student_id));
  return ok(pending);
}

// ============================================================
// USER MANAGEMENT
// ============================================================

function handleListTeachers(user) {
  if (user.role !== 'admin') return err('FORBIDDEN', 'ไม่มีสิทธิ์');

  const sheet = getSheet(SHEETS.USERS);
  if (!sheet) return ok([]);

  const users = sheetToObjects(sheet).map(safeUser);
  return ok(users);
}

function handleCreateTeacher(user, payload) {
  if (user.role !== 'admin') return err('FORBIDDEN', 'ไม่มีสิทธิ์สร้างผู้ใช้');

  const { full_name, username, password, role } = payload;
  if (!full_name || !username || !password) return err('MISSING_FIELDS', 'ข้อมูลไม่ครบ');
  if (password.length < 6) return err('WEAK_PASSWORD', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');

  const validRoles = ['admin', 'teacher', 'assistant'];
  if (!validRoles.includes(role)) return err('INVALID_ROLE', 'บทบาทไม่ถูกต้อง');

  const sheet = getSheet(SHEETS.USERS);
  const existing = sheetToObjects(sheet).find(u => u.username === username);
  if (existing) return err('DUPLICATE_USERNAME', 'ชื่อผู้ใช้นี้มีอยู่แล้ว');

  const salt     = generateSalt();
  const hash     = hashPassword(password, salt);
  const userId   = generateId('U');
  const headers  = ['user_id','full_name','username','password_hash','password_salt','role','status','created_at','last_login'];

  appendRow(sheet, {
    user_id:       userId,
    full_name,
    username,
    password_hash: hash,
    password_salt: salt,
    role:          role || 'teacher',
    status:        'active',
    created_at:    new Date().toISOString(),
    last_login:    '',
  }, headers);

  logActivity_(user.user_id, 'createUser', 'user', userId, username);
  return ok({ user_id: userId }, 'สร้างผู้ใช้สำเร็จ');
}

function handleResetTeacherPassword(user, payload) {
  if (user.role !== 'admin') return err('FORBIDDEN', 'ไม่มีสิทธิ์');

  const { user_id, new_password } = payload;
  if (!user_id || !new_password) return err('MISSING_FIELDS', 'ข้อมูลไม่ครบ');
  if (new_password.length < 6) return err('WEAK_PASSWORD', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');

  const sheet  = getSheet(SHEETS.USERS);
  const rowIdx = findRowIndex(sheet, 'user_id', user_id);
  if (rowIdx < 0) return err('NOT_FOUND', 'ไม่พบผู้ใช้');

  const salt = generateSalt();
  const hash = hashPassword(new_password, salt);
  updateRowFields(sheet, rowIdx, { password_hash: hash, password_salt: salt });

  logActivity_(user.user_id, 'resetPassword', 'user', user_id, '');
  return ok(null, 'รีเซ็ตรหัสผ่านสำเร็จ');
}

function handleRegister(payload) {
  const { full_name, username, password, role } = payload;
  if (!full_name || !username || !password) {
    return err('MISSING_FIELDS', 'กรุณากรอกข้อมูลให้ครบถ้วน');
  }
  if (password.length < 6) {
    return err('WEAK_PASSWORD', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  }

  const validRoles = ['teacher', 'assistant'];
  if (!validRoles.includes(role)) {
    return err('INVALID_ROLE', 'บทบาทไม่ถูกต้อง');
  }

  const sheet = getSheet(SHEETS.USERS);
  if (!sheet) {
    return err('SETUP_REQUIRED', 'ระบบยังไม่ได้ถูกติดตั้ง');
  }

  const users = sheetToObjects(sheet);
  const existing = users.find(u => u.username === username);
  if (existing) {
    return err('DUPLICATE_USERNAME', 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
  }

  const salt     = generateSalt();
  const hash     = hashPassword(password, salt);
  const userId   = generateId('U');
  const headers  = ['user_id','full_name','username','password_hash','password_salt','role','status','created_at','last_login'];

  appendRow(sheet, {
    user_id:       userId,
    full_name,
    username,
    password_hash: hash,
    password_salt: salt,
    role:          role,
    status:        'pending',
    created_at:    new Date().toISOString(),
    last_login:    '',
  }, headers);

  logActivity_(userId, 'register', 'user', userId, `ลงทะเบียนในบทบาท ${role}`);
  return ok(null, 'ลงทะเบียนสำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติใช้งาน');
}

function handleUpdateUserStatus(currentUser, payload) {
  if (currentUser.role !== 'admin') return err('FORBIDDEN', 'ไม่มีสิทธิ์ทำรายการนี้');

  const { user_id, status } = payload;
  if (!user_id || !status) return err('MISSING_FIELDS', 'ข้อมูลไม่ครบถ้วน');

  const validStatuses = ['active', 'suspended', 'pending'];
  if (!validStatuses.includes(status)) return err('INVALID_STATUS', 'สถานะไม่ถูกต้อง');

  const sheet = getSheet(SHEETS.USERS);
  const rowIdx = findRowIndex(sheet, 'user_id', user_id);
  if (rowIdx < 0) return err('NOT_FOUND', 'ไม่พบผู้ใช้ที่ระบุ');

  if (user_id === currentUser.user_id) {
    return err('FORBIDDEN', 'ไม่สามารถแก้ไขสถานะของตัวเองได้');
  }

  updateRowFields(sheet, rowIdx, { status: status });

  logActivity_(currentUser.user_id, 'updateUserStatus', 'user', user_id, status);
  return ok(null, 'อัปเดตสถานะสำเร็จ');
}

function handleDeleteUser(currentUser, payload) {
  if (currentUser.role !== 'admin') return err('FORBIDDEN', 'ไม่มีสิทธิ์ทำรายการนี้');

  const { user_id } = payload;
  if (!user_id) return err('MISSING_FIELDS', 'ข้อมูลไม่ครบถ้วน');

  if (user_id === currentUser.user_id) {
    return err('FORBIDDEN', 'ไม่สามารถลบตัวเองได้');
  }

  const sheet = getSheet(SHEETS.USERS);
  const rowIdx = findRowIndex(sheet, 'user_id', user_id);
  if (rowIdx < 0) return err('NOT_FOUND', 'ไม่พบผู้ใช้ที่ระบุ');

  sheet.deleteRow(rowIdx);

  logActivity_(currentUser.user_id, 'deleteUser', 'user', user_id, '');
  return ok(null, 'ลบผู้ใช้สำเร็จ');
}

// ============================================================
// ACTIVITY LOGS
// ============================================================

function handleLogActivity(user, payload) {
  logActivity_(user.user_id, payload.log_action, payload.target_type, payload.target_id, payload.detail);
  return ok(null);
}

function logActivity_(userId, action, targetType, targetId, detail) {
  try {
    const sheet = getSheet(SHEETS.ACTIVITY_LOGS);
    if (!sheet) return;
    const logId = generateId('LOG');
    const headers = ['log_id','user_id','action','target_type','target_id','detail','created_at'];
    appendRow(sheet, {
      log_id:      logId,
      user_id:     userId || '',
      action:      action || '',
      target_type: targetType || '',
      target_id:   targetId || '',
      detail:      typeof detail === 'object' ? JSON.stringify(detail) : (detail || ''),
      created_at:  new Date().toISOString(),
    }, headers);
  } catch {}
}
