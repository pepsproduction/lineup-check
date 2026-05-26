/**
 * reports.js — LineUp Check
 * Report views: daily, class-level, monthly, pending list.
 */

let _reportUser    = null;
let _reportClasses = [];
let _reportData    = null;

document.addEventListener('DOMContentLoaded', async () => {
  _reportUser = await Auth.requireLogin();
  if (!_reportUser) return;

  renderPageHeader(_reportUser);
  await loadReportClasses();

  // Default date = today
  $id('report-date').value = today();
  const now = new Date();
  $id('report-year').value  = now.getFullYear();
  $id('report-month').value = String(now.getMonth() + 1).padStart(2, '0');

  bindReportEvents();
});

async function loadReportClasses() {
  const res = await API.listClasses();
  if (!res.ok) { showToast(res.message, 'error'); return; }

  _reportClasses = res.data || [];
  const sel = $id('report-class');
  sel.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>' +
    _reportClasses.map(c =>
      `<option value="${escapeHtml(c.class_id)}">${escapeHtml(c.class_name)}</option>`
    ).join('');
}

/* ============================================================
   Tab switching
   ============================================================ */

let _activeTab = 'daily';

function switchTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    toggleEl(panel, panel.id === `tab-${tab}`);
  });
}

/* ============================================================
   Load Reports
   ============================================================ */

async function loadReport() {
  const classId = $id('report-class').value;
  if (!classId) { showToast('กรุณาเลือกห้องเรียน', 'warning'); return; }

  if (_activeTab === 'daily') {
    await loadDailyReport(classId);
  } else if (_activeTab === 'monthly') {
    await loadMonthlyReport(classId);
  } else if (_activeTab === 'pending') {
    await loadPendingList(classId);
  }
}

async function loadDailyReport(classId) {
  const date = $id('report-date').value;
  if (!date) { showToast('กรุณาเลือกวันที่', 'warning'); return; }

  showLoading('กำลังโหลดรายงาน...');
  const res = await API.getDailyReport(classId, date);
  hideLoading();

  if (!res.ok) { showToast(res.message, 'error'); return; }

  _reportData = res.data;
  renderDailyReport(res.data, date);
}

function renderDailyReport(data, date) {
  const container = $id('report-result');
  if (!container) return;

  const summary = data?.summary || {};
  const students = data?.students || [];
  const className = _reportClasses.find(c => c.class_id === $id('report-class').value)?.class_name || '';

  container.innerHTML = `
    <div class="card mb-md">
      <div class="card-title">${escapeHtml(className)}</div>
      <div class="card-subtitle">${formatDateThai(date)}</div>
    </div>

    <div class="stats-grid mb-md">
      <div class="stat-card stat-present">
        <div class="stat-value">${summary.present || 0}</div>
        <div class="stat-label">มา</div>
      </div>
      <div class="stat-card stat-late">
        <div class="stat-value">${summary.late || 0}</div>
        <div class="stat-label">สาย</div>
      </div>
      <div class="stat-card stat-leave">
        <div class="stat-value">${summary.leave || 0}</div>
        <div class="stat-label">ลา</div>
      </div>
      <div class="stat-card stat-absent">
        <div class="stat-value">${summary.absent || 0}</div>
        <div class="stat-label">ขาด</div>
      </div>
      <div class="stat-card stat-pending">
        <div class="stat-value">${summary.pending || 0}</div>
        <div class="stat-label">ยังไม่เช็ค</div>
      </div>
      <div class="stat-card stat-total">
        <div class="stat-value">${summary.total || 0}</div>
        <div class="stat-label">ทั้งหมด</div>
      </div>
    </div>

    <div class="list-card">
      ${students.length === 0
        ? '<div class="empty-state" style="padding:32px"><div class="empty-state-icon">📋</div><div class="empty-state-title">ไม่มีข้อมูล</div></div>'
        : students.map(s => `
          <div class="list-item">
            <div class="list-item-avatar">${escapeHtml(String(s.student_no || '?'))}</div>
            <div class="list-item-content">
              <div class="list-item-title">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</div>
              <div class="list-item-subtitle">
                ${s.scan_time ? `สแกน ${escapeHtml(s.scan_time)}` : 'ยังไม่สแกน'}
                ${s.note ? ` · ${escapeHtml(s.note)}` : ''}
              </div>
            </div>
            <div class="list-item-action">${statusBadgeHtml(s.status || 'pending')}</div>
          </div>`).join('')
      }
    </div>

    <div class="mt-md">
      <button class="btn btn-primary btn-block" onclick="exportExcel()">
        📥 Export Excel
      </button>
    </div>
  `;
}

async function loadMonthlyReport(classId) {
  const year  = $id('report-year').value;
  const month = $id('report-month').value;

  showLoading('กำลังโหลดรายงานรายเดือน...');
  const res = await API.getMonthlyReport(classId, year, month);
  hideLoading();

  if (!res.ok) { showToast(res.message, 'error'); return; }

  _reportData = res.data;
  renderMonthlyReport(res.data, year, month);
}

function renderMonthlyReport(data, year, month) {
  const container = $id('report-result');
  if (!container) return;

  const rows = data?.rows || [];
  const className = _reportClasses.find(c => c.class_id === $id('report-class').value)?.class_name || '';
  const thaiMonths = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                      'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

  container.innerHTML = `
    <div class="card mb-md">
      <div class="card-title">${escapeHtml(className)}</div>
      <div class="card-subtitle">${thaiMonths[parseInt(month)]} ${parseInt(year)+543}</div>
    </div>
    <div class="list-card">
      ${rows.length === 0
        ? '<div class="empty-state" style="padding:32px"><div class="empty-state-icon">📅</div><div class="empty-state-title">ไม่มีข้อมูลเดือนนี้</div></div>'
        : rows.map(s => `
          <div class="list-item">
            <div class="list-item-avatar" style="font-size:13px">${escapeHtml(String(s.student_no || '?'))}</div>
            <div class="list-item-content">
              <div class="list-item-title">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</div>
              <div class="list-item-subtitle">
                มา ${s.present||0} · สาย ${s.late||0} · ลา ${s.leave||0} · ขาด ${s.absent||0}
              </div>
            </div>
          </div>`).join('')
      }
    </div>
    <div class="mt-md">
      <button class="btn btn-primary btn-block" onclick="exportExcel()">📥 Export Excel</button>
    </div>
  `;
}

async function loadPendingList(classId) {
  const date = $id('report-date').value || today();
  showLoading('กำลังโหลดรายชื่อ...');
  const res = await API.listPendingStudents(classId, date);
  hideLoading();

  if (!res.ok) { showToast(res.message, 'error'); return; }

  const pending = res.data || [];
  const container = $id('report-result');

  container.innerHTML = `
    <div class="card mb-md">
      <div class="card-title">นักเรียนที่ยังไม่มา</div>
      <div class="card-subtitle">${formatDateThai(date)} · ${pending.length} คน</div>
    </div>
    <div class="list-card">
      ${pending.length === 0
        ? '<div class="empty-state" style="padding:32px"><div class="empty-state-icon">🎉</div><div class="empty-state-title">นักเรียนมาครบทุกคนแล้ว!</div></div>'
        : pending.map(s => `
          <div class="list-item">
            <div class="list-item-avatar">${escapeHtml(String(s.student_no || '?'))}</div>
            <div class="list-item-content">
              <div class="list-item-title">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</div>
              <div class="list-item-subtitle">รหัส ${escapeHtml(s.student_code || '-')}</div>
            </div>
            <div class="list-item-action">${statusBadgeHtml('pending')}</div>
          </div>`).join('')
      }
    </div>
  `;
}

/* ============================================================
   Export Excel (SheetJS CDN)
   ============================================================ */

function exportExcel() {
  if (!_reportData) { showToast('ไม่มีข้อมูลสำหรับ Export', 'warning'); return; }
  if (typeof XLSX === 'undefined') { showToast('กำลังโหลด SheetJS...', 'info'); return; }

  const classId   = $id('report-class').value;
  const className = _reportClasses.find(c => c.class_id === classId)?.class_name || 'class';
  const dateStr   = $id('report-date')?.value || today();

  const wb = XLSX.utils.book_new();

  /* Summary sheet */
  const summary = _reportData.summary || {};
  const summaryWs = XLSX.utils.aoa_to_sheet([
    ['LineUp Check — สรุปการเช็คชื่อ'],
    ['ห้องเรียน', className],
    ['วันที่', dateStr],
    [],
    ['สถานะ', 'จำนวน'],
    ['มา',           summary.present || 0],
    ['สาย',          summary.late    || 0],
    ['ลา',           summary.leave   || 0],
    ['ขาด',          summary.absent  || 0],
    ['ยังไม่เช็ค',   summary.pending || 0],
    ['รวม',          summary.total   || 0],
  ]);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  /* Attendance sheet */
  const students = _reportData.students || _reportData.rows || [];
  if (students.length > 0) {
    const attWs = XLSX.utils.json_to_sheet(students.map(s => ({
      'เลขที่':       s.student_no   || '',
      'รหัสนักเรียน': s.student_code || '',
      'ชื่อ':          s.first_name   || '',
      'นามสกุล':       s.last_name    || '',
      'สถานะ':         APP_CONFIG.STATUS_LABELS[s.status] || s.status || '',
      'เวลาสแกน':      s.scan_time    || '',
      'หมายเหตุ':       s.note         || '',
    })));
    XLSX.utils.book_append_sheet(wb, attWs, 'Attendance');
  }

  const safeClass = className.replace(/[\\/:*?"<>|]/g, '_');
  const fileName  = `LineUpCheck_${safeClass}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
  showToast('Export สำเร็จ', 'success');
}

/* ============================================================
   Event Bindings
   ============================================================ */

function bindReportEvents() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $id('btn-load-report').addEventListener('click', loadReport);
}
