# CHANGELOG

## v1.0.0 — 2026-05-26

### 🎉 Initial Release

#### Frontend (GitHub Pages)
- **index.html** — Landing page พร้อม Hero gradient animation
- **login.html** — หน้า Login พร้อม toggle password visibility
- **setup.html** — หน้าตั้งค่าครั้งแรก 5 ขั้นตอน พร้อม connection test
- **dashboard.html** — Dashboard แสดง summary วันนี้ + class selector
- **scan.html** — QR Scanner ใช้กล้องมือถือ jsQR library
- **classes.html** — จัดการห้องเรียน Card layout
- **students.html** — จัดการนักเรียน + Import CSV
- **reports.html** — รายงาน 3 แบบ (รายวัน / รายเดือน / ยังไม่มา)
- **qr-print.html** — พิมพ์ QR Card A4 ด้วย qrcodejs
- **settings.html** — ตั้งค่าระบบ + จัดการผู้ใช้
- **offline.html** — Offline Queue + Bulk Sync

#### JavaScript Modules
- **config.js** — Public constants (no secrets)
- **utils.js** — DOM helpers, toast, date/time, localStorage, CSV parser
- **api.js** — POST-based API client ใช้ text/plain เพื่อหลีกเลี่ยง CORS preflight
- **auth.js** — Session management, route guard, role checks
- **app.js** — Shared page init (nav active state, connection monitor)
- **scanner.js** — Camera management + QR decode loop
- **qr-print.js** — QR card generation with qrcodejs
- **students.js** — Students CRUD + CSV import
- **classes.js** — Classes CRUD + teacher assignment
- **reports.js** — Report loading + tab switching
- **excel-export.js** — SheetJS wrapper for attendance/monthly export

#### CSS
- **style.css** — Complete design system (variables, components, utilities)
- **mobile.css** — Mobile-specific + print styles + scanner overlay

#### Backend (Google Apps Script)
- **Code.gs** — 26 API endpoints ครบทุกฟีเจอร์
  - ping, setupInit, login, logout, me
  - listClasses, createClass, updateClass
  - listStudents, createStudent, updateStudent, importStudents
  - scanAttendance, updateAttendanceStatus, getStudentByQr
  - getTodaySummary, getDailyReport, getMonthlyReport, listPendingStudents
  - listTeachers, createTeacher, resetTeacherPassword
  - getSettings, updateSettings, logActivity

#### Security
- Password hashing ด้วย SHA-256 + Salt (ฝั่ง Apps Script)
- Session token เก็บใน Google Sheet + expires_at
- Role-based access control ทุก endpoint
- ไม่ส่ง password_hash กลับ frontend
- QR token เป็น UUID random ไม่เดายาก

#### Documentation
- README.md
- DEPLOY_GUIDE_TH.md (Thai step-by-step)
- apps-script/README_APPS_SCRIPT_TH.md
- templates/google-sheet-structure.md
- templates/sample-students.csv
- tests/manual-test-checklist.md
- tests/smoke-test.md
