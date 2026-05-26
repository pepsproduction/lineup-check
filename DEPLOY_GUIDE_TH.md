# คู่มือ Deploy LineUp Check — ฉบับภาษาไทย

## 📋 ภาพรวม

```
GitHub Pages (เว็บ) ←→ Google Apps Script (API) ←→ Google Sheets (ฐานข้อมูล)
```

---

## ขั้นตอนที่ 1: สร้าง Google Sheet

1. ไปที่ [sheets.google.com](https://sheets.google.com) และ Login ด้วย Google Account
2. กด **+ Blank** เพื่อสร้าง Spreadsheet ใหม่
3. ตั้งชื่อ Spreadsheet: `LineUp Check DB` (หรือชื่ออะไรก็ได้)
4. สังเกต URL จะมีรูปแบบ:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```
5. คัดลอก `SPREADSHEET_ID` ไว้ (ส่วนระหว่าง `/d/` กับ `/edit`)

---

## ขั้นตอนที่ 2: เปิด Apps Script Editor

1. ใน Google Sheet → เลือกเมนู **Extensions** → **Apps Script**
2. Apps Script Editor จะเปิดในแท็บใหม่
3. คุณจะเห็น Code.gs ที่มีโค้ดว่างอยู่

---

## ขั้นตอนที่ 3: วาง Code.gs

1. ลบโค้ดที่มีอยู่ออกทั้งหมด (Ctrl+A แล้ว Delete)
2. เปิดไฟล์ `apps-script/Code.gs` จากโปรเจค LineUp Check
3. คัดลอกโค้ดทั้งหมด แล้ววางลงใน Apps Script Editor
4. **แก้ไขบรรทัดที่ 10:**
   ```javascript
   const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
   // เปลี่ยนเป็น ID ที่คัดลอกไว้จากขั้นตอนที่ 1
   // เช่น:
   const SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms';
   ```
5. กด **Save** (Ctrl+S หรือปุ่ม 💾)
6. ตั้งชื่อโปรเจค: `LineUp Check` แล้วกด OK

---

## ขั้นตอนที่ 4: Deploy เป็น Web App

1. กดปุ่ม **Deploy** (มุมบนขวา) → **New deployment**
2. กดไอคอน ⚙️ ถัดจาก **Select type** → เลือก **Web App**
3. ตั้งค่าดังนี้:

   | ฟิลด์ | ค่าที่ต้องเลือก |
   |-------|----------------|
   | Description | LineUp Check API v1 |
   | Execute as | **Me** (your Google account) |
   | Who has access | **Anyone** |

4. กด **Deploy**
5. ระบบจะขอ Permission → กด **Review permissions**
6. เลือก Google Account ของคุณ
7. ถ้าเห็น "Google hasn't verified this app" → กด **Advanced** → **Go to LineUp Check (unsafe)**
8. กด **Allow**
9. **คัดลอก Web App URL** (จะมีรูปแบบ):
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> ⚠️ **สำคัญ**: URL นี้ต้องเก็บไว้ใช้ในขั้นตอนถัดไป

---

## ขั้นตอนที่ 5: ใส่ URL ในหน้า Setup

1. เปิดเว็บ LineUp Check ในเบราว์เซอร์ (GitHub Pages หรือ localhost)
2. ไปที่หน้า **Setup** (`/setup.html`)
3. วาง Web App URL ในช่อง "Apps Script Web App URL"
4. กด **ทดสอบ** — รอดูว่าเชื่อมต่อสำเร็จหรือไม่
5. ถ้าสำเร็จ ✅ → กด **สร้างข้อมูลเริ่มต้น (Setup Init)**
6. บันทึก username/password ที่ได้ไว้ เช่น `admin / admin1234`
7. กด **บันทึกและเข้าใช้งาน**

---

## ขั้นตอนที่ 6: Login และเปลี่ยนรหัสผ่าน

1. Login ด้วย `admin` / `admin1234`
2. ไปที่ **ตั้งค่า** → เพิ่มผู้ใช้ใหม่ หรือแก้ไข Admin
3. **⚠️ เปลี่ยนรหัสผ่าน Admin ทันที!**

---

## ขั้นตอนที่ 7: เพิ่มห้องเรียนและนักเรียน

### เพิ่มห้องเรียน
1. ไปที่ **ห้องเรียน** → กด ➕
2. ใส่ชื่อห้อง, ระดับชั้น, ห้อง, ครูประจำชั้น
3. กด บันทึก

### เพิ่มนักเรียน (Import CSV)
1. ไปที่ **นักเรียน** → กด **Import CSV**
2. เลือกห้องเรียน
3. Upload ไฟล์ CSV ตามรูปแบบ:
   ```csv
   เลขที่,รหัสนักเรียน,ชื่อ,นามสกุล
   1,1001,สมชาย,ใจดี
   2,1002,สมหญิง,ตั้งใจ
   ```
4. ดูตัวอย่างที่ `templates/sample-students.csv`
5. กด **นำเข้าข้อมูล**

---

## ขั้นตอนที่ 8: พิมพ์ QR Code บัตรนักเรียน

1. ไปที่ **พิมพ์ QR** (`/qr-print.html`)
2. เลือกห้องเรียน
3. กด **สร้าง QR** — รอสักครู่
4. กด **พิมพ์** หรือ Ctrl+P
5. ตั้งค่า Print:
   - ขนาด: A4
   - ขอบ: ขนาดเล็กสุด หรือ None
   - Background graphics: ✅ เปิด
6. ตัดบัตรแจกนักเรียนได้เลย

---

## ขั้นตอนที่ 9: เช็คชื่อด้วย QR (ใช้มือถือ)

1. เปิดเว็บบนมือถือ (Chrome แนะนำ)
2. Login เข้าระบบ
3. กดปุ่ม 📷 ใน Bottom Nav หรือ "เริ่มสแกน QR"
4. เลือกห้องเรียนที่ต้องการเช็คชื่อ
5. สแกน QR ของนักเรียนทีละคน
6. ระบบจะแสดงชื่อ, เวลา, สถานะ (มา/สาย)

> 💡 **Tips**: ตั้งเวลาสาย (ค่าเริ่มต้น 08:00) ได้ที่ ตั้งค่า → ตั้งค่าระบบ

---

## ขั้นตอนที่ 10: Export Excel

1. ไปที่ **รายงาน** (`/reports.html`)
2. เลือกห้องเรียน + วันที่
3. กด **ดูรายงาน**
4. กด **Export Excel** → ดาวน์โหลดไฟล์ .xlsx

---

## 🔧 วิธี Deploy บน GitHub Pages

1. สร้าง repository ใหม่บน GitHub
2. Upload ไฟล์ทั้งหมด **ยกเว้น** `apps-script/` folder
3. ไปที่ Settings → Pages
4. Source: **Deploy from a branch**
5. Branch: **main** / Folder: **/ (root)**
6. Save → รอประมาณ 2-5 นาที
7. เว็บจะ live ที่ `https://username.github.io/repo-name`

---

## ❓ แก้ปัญหาที่พบบ่อย

### 🔴 "เชื่อมต่อ API ไม่ได้"
- ตรวจสอบว่า Deploy URL ถูกต้อง (ต้องลงท้ายด้วย `/exec`)
- ตรวจสอบว่า Who has access = **Anyone**
- ลอง Deploy ใหม่ (New deployment) แล้วใช้ URL ใหม่

### 🔴 "Setup ล้มเหลว"
- ตรวจสอบ SPREADSHEET_ID ใน Code.gs ว่าถูกต้อง
- ตรวจสอบว่า Google Account ที่ Deploy มีสิทธิ์เข้า Sheet

### 🔴 "กล้องไม่ทำงาน"
- เบราว์เซอร์ต้องใช้ HTTPS (GitHub Pages ใช้ HTTPS อยู่แล้ว)
- Localhost ก็ได้ เพราะถือว่า secure context
- ให้สิทธิ์กล้องใน Settings ของเบราว์เซอร์

### 🔴 "แก้ Code.gs แล้วยังไม่อัปเดต"
- ต้อง Deploy ใหม่ทุกครั้ง: **Deploy → Manage deployments → แก้เวอร์ชัน**
- หรือสร้าง New deployment ใหม่

---

## 📞 ติดต่อและ Support

หากพบปัญหา สามารถ:
- เปิด Issue บน GitHub
- ดู logs ใน Apps Script: **Executions** หรือ **View → Logs**
