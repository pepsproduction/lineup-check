# คู่มือ Apps Script — LineUp Check

## 📋 ภาพรวม

`Code.gs` คือ Backend ทั้งหมดของ LineUp Check ทำงานเป็น Google Apps Script Web App รับ POST request จาก Frontend แล้วอ่าน/เขียนข้อมูลใน Google Sheet

---

## 🚀 วิธีติดตั้งแบบละเอียด

### ขั้นตอนที่ 1: สร้าง Google Sheet

1. ไป https://sheets.google.com
2. สร้าง Spreadsheet ใหม่
3. ตั้งชื่อ: `LineUp Check DB`
4. คัดลอก **Spreadsheet ID** จาก URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### ขั้นตอนที่ 2: เปิด Apps Script

1. ใน Google Sheet: **Extensions** → **Apps Script**
2. แท็บใหม่จะเปิด Apps Script Editor

### ขั้นตอนที่ 3: วาง Code.gs

1. ลบโค้ดเดิมออกทั้งหมด (Ctrl+A → Delete)
2. คัดลอกเนื้อหาจากไฟล์ `apps-script/Code.gs`
3. วางลง Editor
4. **แก้ไขบรรทัดนี้:**
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   // เปลี่ยนเป็น ID จริง เช่น:
   const SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
   ```
5. **Save** (Ctrl+S)

### ขั้นตอนที่ 4: Deploy Web App

1. กด **Deploy** → **New deployment**
2. กดไอคอน ⚙️ → เลือก **Web App**
3. ตั้งค่า:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. กด **Deploy**
5. อนุมัติ Permission:
   - Review permissions → เลือก Account
   - ถ้าเห็น "unverified" → Advanced → Go to app
   - Allow
6. **คัดลอก Web App URL**

---

## 🔑 Permission ที่ต้องอนุมัติ

| Permission | เหตุผล |
|-----------|--------|
| See, edit, create, delete your spreadsheets | อ่าน/เขียน Google Sheet |
| Connect to external service | รับ POST จาก Frontend |

> ✅ ไม่ต้องการ permission อื่น — ไม่มีการส่ง Email หรือเข้า Drive

---

## 🧪 วิธีทดสอบ Ping

### ทดสอบผ่าน Browser
เปิด URL ตรงๆ (GET request):
```
https://script.google.com/macros/s/YOUR_ID/exec
```
ควรได้:
```json
{"ok":true,"message":"LineUp Check API ทำงานปกติ"}
```

### ทดสอบผ่าน curl (สำหรับ devs)
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_ID/exec" \
  -H "Content-Type: text/plain" \
  -d '{"action":"ping"}'
```
ควรได้:
```json
{"ok":true,"data":{"version":"1.0.0","time":"..."},"message":"pong"}
```

### ทดสอบผ่าน Setup Page
1. เปิด `setup.html`
2. วาง URL → กด **ทดสอบ**
3. ควรเห็น ✅ เชื่อมต่อสำเร็จ

---

## 📊 Google Sheet Structure

Apps Script จะสร้าง Sheet เหล่านี้อัตโนมัติเมื่อกด **Setup Init**:

| Sheet | คำอธิบาย |
|-------|---------|
| Users | บัญชีผู้ใช้ทุกคน (hash password) |
| Classes | ข้อมูลห้องเรียน |
| ClassMembers | ความสัมพันธ์ ครู-ห้อง |
| Students | รายชื่อนักเรียน + QR token |
| Attendance | บันทึกการเช็คชื่อทุกวัน |
| Sessions | Session token ที่ยังใช้งาน |
| Settings | ค่าตั้งค่าระบบ |
| ActivityLogs | Log การกระทำสำคัญ |

---

## 🔄 วิธีอัปเดต Code เมื่อมีการแก้ไข

1. แก้ไข Code.gs ใน Apps Script Editor
2. **Deploy** → **Manage deployments**
3. เลือก deployment ที่มีอยู่ → **Edit** (ดินสอ ✏️)
4. Version: เลือก **New version**
5. กด **Deploy**

> ⚠️ ถ้า Deploy ใหม่ (New deployment) URL จะเปลี่ยน → ต้องอัปเดตในหน้า Setup ด้วย

---

## 🐛 การ Debug

### ดู Logs
1. Apps Script Editor → **Executions** (ซ้าย)
2. หรือ **View** → **Logs** (Ctrl+Enter)
3. เพิ่ม `console.log()` หรือ `Logger.log()` ในโค้ด

### Error ที่พบบ่อย

| Error | สาเหตุ | วิธีแก้ |
|-------|--------|---------|
| Cannot read properties of null | Sheet ไม่มีชื่อที่ถูกต้อง | ตรวจสอบ SPREADSHEET_ID |
| SpreadsheetApp.openById() failed | ไม่มีสิทธิ์เข้า Sheet | Share Sheet กับ account ที่ Deploy |
| Exceeded maximum execution time | คำนวณนาน / Sheet ใหญ่เกิน | แบ่งการทำงาน หรือ optimize query |
| CORS error | ไม่ใช่ปัญหา Apps Script แต่เป็น frontend | ตรวจสอบ Content-Type ใน api.js |

---

## 🔒 ความปลอดภัย

- Password ถูก hash ด้วย SHA-256 + Random salt ก่อนเก็บ
- Session token เป็น UUID ไม่สามารถเดาได้
- Session มี expires_at (ค่าเริ่มต้น 24 ชั่วโมง)
- ทุก action ตรวจสอบ session และ role ก่อน
- ไม่ส่ง password_hash/salt กลับ frontend เลย
- QR token เป็น UUID random — ไม่เปิดเผยข้อมูลนักเรียน
- ActivityLogs บันทึกทุก action สำคัญ

---

## 📌 API Endpoint Reference

### Public (ไม่ต้อง Login)
| action | คำอธิบาย |
|--------|---------|
| ping | ทดสอบว่า API ทำงาน |
| setupInit | สร้าง Sheets และ Admin account |
| login | เข้าสู่ระบบ → ได้ session_token |

### Protected (ต้องส่ง session_token)
| action | คำอธิบาย | Role ที่อนุญาต |
|--------|---------|--------------|
| logout | ออกจากระบบ | ทุก Role |
| me | ดูข้อมูล user ตัวเอง | ทุก Role |
| getSettings | ดูค่าตั้งค่า | ทุก Role |
| updateSettings | แก้ค่าตั้งค่า | admin |
| listClasses | รายการห้องเรียน | ทุก Role |
| createClass | สร้างห้องเรียน | admin, teacher |
| updateClass | แก้ไขห้องเรียน | admin, teacher |
| listStudents | รายชื่อนักเรียน | ทุก Role |
| createStudent | เพิ่มนักเรียน | admin, teacher |
| updateStudent | แก้ไขนักเรียน | admin, teacher |
| importStudents | Import CSV | admin, teacher |
| getStudentByQr | ค้นหาด้วย QR | ทุก Role |
| scanAttendance | บันทึกการสแกน | ทุก Role |
| updateAttendanceStatus | แก้สถานะ | ทุก Role |
| getTodaySummary | สรุปวันนี้ | ทุก Role |
| getDailyReport | รายงานรายวัน | ทุก Role |
| getMonthlyReport | รายงานรายเดือน | ทุก Role |
| listPendingStudents | คนยังไม่มา | ทุก Role |
| listTeachers | รายการผู้ใช้ | admin |
| createTeacher | สร้างผู้ใช้ | admin |
| resetTeacherPassword | รีเซ็ตรหัสผ่าน | admin |
| logActivity | บันทึก log | ทุก Role |
