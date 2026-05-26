/**
 * config.js — LineUp Check
 * Public configuration only. No secrets here.
 */

const APP_CONFIG = {
  APP_NAME: 'LineUp Check',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'ระบบเช็คชื่อนักเรียนเข้าแถวด้วย QR Code',

  // ผู้ใช้ต้องใส่ URL จากหน้า Setup ก่อนใช้งาน
  // ค่าเริ่มต้นว่าง — ระบบจะดึงจาก localStorage
  DEFAULT_API_URL: '',

  // ตั้งค่าเวลาสาย (HH:MM)
  DEFAULT_LATE_AFTER: '08:00',

  // Session หมดอายุ (ชั่วโมง)
  SESSION_EXPIRE_HOURS: 24,

  // QR Prefix
  QR_TOKEN_PREFIX: 'QR-',

  // Offline Queue key
  OFFLINE_QUEUE_KEY: 'lineup_offline_queue',

  // LocalStorage keys
  STORAGE_KEYS: {
    API_URL:       'lineup_api_url',
    SESSION_TOKEN: 'lineup_session_token',
    USER_INFO:     'lineup_user_info',
    SCHOOL_NAME:   'lineup_school_name',
    LATE_AFTER:    'lineup_late_after',
    LAST_CLASS:    'lineup_last_class',
  },

  // Roles
  ROLES: {
    ADMIN:     'admin',
    TEACHER:   'teacher',
    ASSISTANT: 'assistant',
  },

  // Status labels
  STATUS_LABELS: {
    present: 'มา',
    late:    'สาย',
    leave:   'ลา',
    absent:  'ขาด',
    pending: 'ยังไม่เช็ค',
  },

  STATUS_ICONS: {
    present: '✅',
    late:    '⏰',
    leave:   '🔵',
    absent:  '❌',
    pending: '⭕',
  },

  // Toast duration (ms)
  TOAST_DURATION: 3000,

  // Debounce delay for search (ms)
  SEARCH_DEBOUNCE: 400,
};

// Freeze to prevent accidental mutation
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.STORAGE_KEYS);
Object.freeze(APP_CONFIG.ROLES);
Object.freeze(APP_CONFIG.STATUS_LABELS);
Object.freeze(APP_CONFIG.STATUS_ICONS);
