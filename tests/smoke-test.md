# Smoke Test — LineUp Check

## ใช้งานหลัง Deploy ใหม่ ใช้เวลาประมาณ 10 นาที

---

## ✅ ขั้นตอน Smoke Test (ทดสอบ Happy Path)

### 1. API Ping (1 นาที)
1. เปิด URL: `https://YOUR_SCRIPT_URL/exec`
2. ✅ ควรเห็น JSON: `{"ok":true,"message":"LineUp Check API ทำงานปกติ"}`

### 2. Setup (2 นาที)
1. เปิด `/setup.html`
2. ใส่ Apps Script URL
3. กด "ทดสอบ" → ✅ เชื่อมต่อสำเร็จ
4. กด "สร้างข้อมูลเริ่มต้น" → ✅ บันทึก admin credentials
5. กด "บันทึกและเข้าใช้งาน" → ✅ redirect ไป login

### 3. Login (1 นาที)
1. Login ด้วย `admin / admin1234`
2. ✅ redirect ไป dashboard
3. ✅ เห็นชื่อผู้ใช้ใน header

### 4. เพิ่มห้องเรียน (1 นาที)
1. ไป Classes → กด ➕
2. ใส่ชื่อ "ม.1/1" → บันทึก
3. ✅ เห็นห้อง ม.1/1 ในรายการ

### 5. เพิ่มนักเรียน (1 นาที)
1. ไป Students → กด ➕
2. เลือกห้อง "ม.1/1", ชื่อ "สมชาย", นามสกุล "ใจดี"
3. ✅ เห็นนักเรียนในรายการ
4. ✅ ตรวจใน Sheet ว่ามี qr_token

### 6. สร้าง QR และ Scan (2 นาที)
1. ไป QR Print → เลือก ม.1/1 → กด "สร้าง QR"
2. ✅ เห็น QR Card ของสมชาย
3. สแกน QR ด้วยมือถือ (หรือ DevTools Camera)
4. ✅ แสดง "เช็คชื่อสำเร็จ" + ชื่อ + เวลา

### 7. ดูรายงาน (1 นาที)
1. ไป Reports → เลือก ม.1/1 → วันนี้ → ดูรายงาน
2. ✅ เห็น สมชาย status = present
3. ✅ Summary มา = 1

### 8. Logout (30 วินาที)
1. กด Logout
2. ✅ redirect ไป login
3. พยายามเข้า /dashboard.html โดยตรง
4. ✅ redirect กลับ login

---

## ❌ ถ้า Smoke Test ล้มเหลว

| อาการ | สิ่งที่ต้องตรวจ |
|-------|--------------|
| Setup ทดสอบไม่ผ่าน | Apps Script URL ผิด / ยังไม่ Deploy |
| Setup Init error | SPREADSHEET_ID ผิด ใน Code.gs |
| Login ไม่ได้ | Sheet Users ว่าง / Setup Init ยังไม่ทำ |
| สแกน QR แล้วไม่มีข้อมูล | นักเรียนอาจ active = 0 |
| รายงานว่าง | ตรวจ Sheet Attendance |
| Export ไม่ได้ | SheetJS CDN โหลดไม่ได้ (ตรวจ internet) |

---

## 🔁 ทำ Smoke Test ซ้ำหลัง

- อัปเดต Code.gs และ Deploy ใหม่
- อัปเดตไฟล์ HTML/JS ใน GitHub Pages
- พบ bug และ fix แล้ว
