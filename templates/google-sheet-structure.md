# โครงสร้าง Google Sheet — LineUp Check

## ภาพรวม

ระบบใช้ Google Sheet เป็นฐานข้อมูล Apps Script จะสร้าง Sheet เหล่านี้อัตโนมัติเมื่อกด **Setup Init**

---

## Sheet: Users

บัญชีผู้ใช้ทุกคน (ครู, ผู้ดูแล, ผู้ช่วย)

| Column | Type | คำอธิบาย | ตัวอย่าง |
|--------|------|---------|---------|
| user_id | String | ID ไม่ซ้ำ (auto) | U1A2B3C4D5E6 |
| full_name | String | ชื่อ-นามสกุล | นายสมชาย ใจดี |
| username | String | ชื่อผู้ใช้ (unique) | teacher01 |
| password_hash | String | SHA-256 hash | 3a7bd3e2... |
| password_salt | String | Random salt | 4f9a2b8c... |
| role | Enum | admin / teacher / assistant | teacher |
| status | Enum | active / inactive | active |
| created_at | ISO DateTime | วันที่สร้าง | 2026-05-26T06:00:00Z |
| last_login | ISO DateTime | Login ล่าสุด | 2026-05-26T08:30:00Z |

> ⚠️ `password_hash` และ `password_salt` จะไม่ถูกส่งกลับ frontend เลย

---

## Sheet: Classes

ข้อมูลห้องเรียน

| Column | Type | คำอธิบาย | ตัวอย่าง |
|--------|------|---------|---------|
| class_id | String | ID ห้องเรียน | CLS1A2B3C4D5 |
| class_name | String | ชื่อห้อง | ม.1/1 |
| owner_user_id | String | user_id ของครูประจำชั้น | U1A2B3C4D5E6 |
| level | String | ระดับชั้น | มัธยมศึกษาปีที่ 1 |
| room | String | เลขห้อง | 101 |
| active | String | 1 = เปิด, 0 = ปิด | 1 |
| created_at | ISO DateTime | วันที่สร้าง | 2026-05-26T06:00:00Z |

---

## Sheet: ClassMembers

ความสัมพันธ์ระหว่างครูและห้องเรียน (กรณีครูดูแลหลายห้อง)

| Column | Type | คำอธิบาย | ตัวอย่าง |
|--------|------|---------|---------|
| class_id | String | ID ห้องเรียน | CLS1A2B3C4D5 |
| user_id | String | ID ครู | U1A2B3C4D5E6 |
| permission | String | view / edit | edit |
| created_at | ISO DateTime | วันที่เพิ่ม | 2026-05-26T06:00:00Z |

---

## Sheet: Students

รายชื่อนักเรียนทั้งหมด

| Column | Type | คำอธิบาย | ตัวอย่าง |
|--------|------|---------|---------|
| student_id | String | ID นักเรียน | STU1A2B3C4D5 |
| class_id | String | ID ห้องเรียน | CLS1A2B3C4D5 |
| student_no | String | เลขที่ในห้อง | 1 |
| student_code | String | รหัสนักเรียน | 1001 |
| first_name | String | ชื่อ | สมชาย |
| last_name | String | นามสกุล | ใจดี |
| qr_token | String | Token สำหรับ QR (random) | QR-C001-S001-X8F29K |
| active | String | 1 = ใช้งาน, 0 = ปิดใช้ | 1 |
| created_at | ISO DateTime | วันที่เพิ่ม | 2026-05-26T06:00:00Z |

> ✅ `qr_token` เป็นค่า random ไม่เปิดเผยข้อมูลส่วนตัวโดยตรง

---

## Sheet: Attendance

บันทึกการเช็คชื่อทุกวัน

| Column | Type | คำอธิบาย | ตัวอย่าง |
|--------|------|---------|---------|
| attendance_id | String | ID บันทึก | ATT1A2B3C4D5 |
| date | String (YYYY-MM-DD) | วันที่เช็คชื่อ | 2026-05-26 |
| class_id | String | ID ห้องเรียน | CLS1A2B3C4D5 |
| student_id | String | ID นักเรียน | STU1A2B3C4D5 |
| status | Enum | present / late / leave / absent / pending | present |
| scan_time | String (HH:MM) | เวลาที่สแกน | 07:45 |
| checked_by_user_id | String | ID ครูที่เช็ค | U1A2B3C4D5E6 |
| method | Enum | qr / manual | qr |
| note | String | หมายเหตุ | ลาป่วย |
| created_at | ISO DateTime | เวลาสร้าง record | 2026-05-26T07:45:30Z |

### สถานะที่รองรับ
| Status | ความหมาย | สี UI |
|--------|---------|------|
| present | มา | เขียว ✅ |
| late | สาย | เหลือง ⏰ |
| leave | ลา | ฟ้า 🔵 |
| absent | ขาด | แดง ❌ |
| pending | ยังไม่เช็ค | เทา ⭕ |

---

## Sheet: Sessions

Session token ที่ยังใช้งานอยู่

| Column | Type | คำอธิบาย |
|--------|------|---------|
| session_token | String | UUID token (unique) |
| user_id | String | เจ้าของ session |
| created_at | ISO DateTime | เวลาสร้าง |
| expires_at | ISO DateTime | เวลาหมดอายุ |
| device_name | String | ชื่ออุปกรณ์ |
| active | String | true / false |

---

## Sheet: Settings

ค่าตั้งค่าระบบ (key-value pairs)

| Key | ค่าเริ่มต้น | คำอธิบาย |
|-----|-----------|---------|
| school_name | โรงเรียนตัวอย่าง | ชื่อโรงเรียน |
| late_after | 08:00 | เวลาเริ่มนับว่า "สาย" |

---

## Sheet: ActivityLogs

บันทึก action สำคัญของผู้ใช้

| Column | Type | คำอธิบาย |
|--------|------|---------|
| log_id | String | ID log |
| user_id | String | ผู้ทำ action |
| action | String | login / scan / createStudent / ... |
| target_type | String | user / student / class / attendance / settings |
| target_id | String | ID ของ target |
| detail | String | รายละเอียดเพิ่มเติม |
| created_at | ISO DateTime | เวลา |
