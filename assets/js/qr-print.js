/**
 * qr-print.js — LineUp Check
 * Generates printable QR code cards for students.
 * Uses qrcode.js (CDN) to render QR codes.
 */

let _printUser    = null;
let _printClasses = [];
let _printStudents = [];

document.addEventListener('DOMContentLoaded', async () => {
  _printUser = await Auth.requireLogin();
  if (!_printUser) return;

  renderPageHeader(_printUser);
  await loadClasses();

  $id('class-select').addEventListener('change', onClassChange);
  $id('btn-print').addEventListener('click', () => window.print());
  $id('btn-generate').addEventListener('click', generateCards);
});

async function loadClasses() {
  const res = await API.listClasses();
  if (!res.ok) {
    showToast(res.message, 'error');
    return;
  }
  _printClasses = res.data || [];
  const sel = $id('class-select');
  sel.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>' +
    _printClasses.map(c => `<option value="${escapeHtml(c.class_id)}">${escapeHtml(c.class_name)}</option>`).join('');
}

async function onClassChange() {
  const classId = $id('class-select').value;
  if (!classId) {
    hideEl('print-area');
    return;
  }
  showLoading('กำลังโหลดรายชื่อนักเรียน...');
  const res = await API.listStudents(classId);
  hideLoading();
  if (!res.ok) {
    showToast(res.message, 'error');
    return;
  }
  _printStudents = (res.data || []).filter(s => s.active !== false && s.active !== 'false' && s.active !== '0');
  $id('student-count').textContent = `${_printStudents.length} คน`;
  showEl('print-controls');
}

async function generateCards() {
  if (_printStudents.length === 0) {
    showToast('ไม่พบนักเรียน', 'warning');
    return;
  }

  const className = $id('class-select').selectedOptions[0]?.text || '';
  const grid = $id('qr-grid');
  grid.innerHTML = '';

  showLoading('กำลังสร้าง QR...');

  for (const student of _printStudents) {
    const card = document.createElement('div');
    card.className = 'qr-card';

    const qrDiv = document.createElement('div');
    qrDiv.id = `qr-${student.student_id}`;

    card.innerHTML = `
      <div class="qr-card-no">เลขที่ ${escapeHtml(String(student.student_no))}</div>
      <div class="qr-card-name">${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</div>
      <div class="qr-card-class">${escapeHtml(className)}</div>
    `;
    card.appendChild(qrDiv);

    const tokenEl = document.createElement('div');
    tokenEl.className = 'qr-card-token';
    tokenEl.textContent = student.qr_token;
    card.appendChild(tokenEl);

    grid.appendChild(card);

    // Render QR — qrcode.js creates canvas or img in div
    try {
      new QRCode(qrDiv, {
        text:          student.qr_token,
        width:         100,
        height:        100,
        correctLevel:  QRCode.CorrectLevel.M,
      });
    } catch {}
  }

  hideLoading();
  showEl('print-area');
  showToast(`สร้าง QR ${_printStudents.length} ดวงสำเร็จ`, 'success');
}
