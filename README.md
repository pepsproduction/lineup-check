# LineUp Check — ระบบเช็คชื่อนักเรียนเข้าแถวด้วย QR Code

<p align="center">
  <img src="assets/img/logo.svg" alt="LineUp Check" width="80">
</p>

<p align="center">
  <strong>LineUp Check</strong> — Web App เช็คชื่อนักเรียนผ่านมือถือ ไม่ต้องติดตั้งแอป
</p>

---

## ✨ ฟีเจอร์หลัก

- 📷 **สแกน QR** ผ่านกล้องมือถือ ไม่ต้องโหลดแอป
- 📊 **Dashboard** สรุปสถานการณ์วันนี้แบบ Real-time
- 🏫 **จัดการห้องเรียน** เพิ่ม / แก้ไข / กำหนดครูประจำชั้น
- 👥 **จัดการนักเรียน** เพิ่มทีละคน หรือ Import CSV
- 🖨️ **พิมพ์ QR** สร้างบัตร QR รายห้องพร้อมพิมพ์ A4
- 📈 **รายงาน** รายวัน รายเดือน ดูคนยังไม่มา Export Excel
- 📤 **Offline Queue** เก็บสแกนไว้ถ้าเน็ตหลุด Sync เองเมื่อกลับมา
- 🔒 **3 Role** Admin / Teacher / Assistant

## 🏗️ สถาปัตยกรรม

```
GitHub Pages (Frontend)  ←→  Google Apps Script (API)  ←→  Google Sheets (DB)
```

- **ไม่มี server เช่า** — ใช้ Google ฟรีทั้งหมด
- **ไม่มีค่าใช้จ่าย** ในขนาดโรงเรียนทั่วไป

## 📂 โครงสร้างโปรเจค

```
lineup-check/
  index.html          — หน้าแรก / Landing Page
  login.html          — เข้าสู่ระบบ
  setup.html          — ตั้งค่า Apps Script URL (ครั้งแรก)
  dashboard.html      — แดชบอร์ด
  scan.html           — สแกน QR
  classes.html        — จัดการห้องเรียน
  students.html       — จัดการนักเรียน
  reports.html        — รายงาน + Export
  qr-print.html       — พิมพ์ QR บัตร
  settings.html       — ตั้งค่าระบบ
  offline.html        — Offline Queue
  assets/
    css/
      style.css       — Design System หลัก
      mobile.css      — Mobile / Print styles
    js/
      config.js       — ค่า config สาธารณะ
      utils.js        — Helper functions
      api.js          — API Client (POST to Apps Script)
      auth.js         — Session / Auth guard
      app.js          — Shared page init
      scanner.js      — QR Camera scanner
      qr-print.js     — QR card generator
      students.js     — Students page logic
      classes.js      — Classes page logic
      reports.js      — Reports page logic
      excel-export.js — SheetJS export helper
  apps-script/
    Code.gs           — Google Apps Script ทั้งหมด
    README_APPS_SCRIPT_TH.md
  templates/
    google-sheet-structure.md
    sample-students.csv
  tests/
    manual-test-checklist.md
    smoke-test.md
```

## 🚀 วิธีเปิดเว็บใน Local

```bash
# Python 3
python -m http.server 8080

# หรือ Node.js
npx -y serve . -p 8080
```

เปิด browser ที่ `http://localhost:8080`

## 🌐 วิธี Deploy บน GitHub Pages

1. สร้าง repo ใหม่บน GitHub
2. Upload ทุกไฟล์ขึ้น repo (ยกเว้น `apps-script/`)
3. ไปที่ Settings → Pages → Source: **main / root**
4. เว็บจะออนไลน์ที่ `https://username.github.io/repo-name/`

## 🔧 วิธีติดตั้ง Apps Script

ดูรายละเอียดที่ [DEPLOY_GUIDE_TH.md](DEPLOY_GUIDE_TH.md)

## 📋 วิธีใช้งานเบื้องต้น

1. เข้า `/setup.html` → ใส่ Apps Script URL → ทดสอบ → บันทึก
2. เข้า `/login.html` → Login ด้วย `admin / admin1234`
3. ไป Settings → เปลี่ยนรหัสผ่าน Admin ทันที
4. ไป Classes → เพิ่มห้องเรียน
5. ไป Students → เพิ่มนักเรียน หรือ Import CSV
6. ไป QR Print → เลือกห้อง → สร้าง QR → พิมพ์
7. ไป Scan → เลือกห้อง → สแกน QR นักเรียน
8. ไป Reports → ดูรายงาน / Export Excel

## ⚠️ ข้อควรระวัง

- เปลี่ยนรหัสผ่าน Admin ทันทีหลังติดตั้ง
- อย่า share Apps Script URL กับคนที่ไม่ควรรู้ (แม้จะไม่ใช่ secret จริง)
- ข้อมูลนักเรียนอยู่ใน Google Sheet — ดูแลการเข้าถึงให้ดี

## 🗺️ แผน V2

- Service Worker / PWA สมบูรณ์
- การแจ้งเตือนผ่าน LINE / Email
- ระบบหยุดเรียน
- Multi-school support
- การเช็คชื่อด้วยใบหน้า

## 📄 License

MIT — ใช้ได้เลยสำหรับโรงเรียนและองค์กรการศึกษา
