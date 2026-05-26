/**
 * students.js — LineUp Check
 * Student management: list, add, edit, import CSV, search.
 */

let _studUser      = null;
let _studClasses   = [];
let _studStudents  = [];
let _studCurrentClass = '';
let _editingStudent = null;

document.addEventListener('DOMContentLoaded', async () => {
  _studUser = await Auth.requireLogin([
    APP_CONFIG.ROLES.ADMIN,
    APP_CONFIG.ROLES.TEACHER,
  ]);
  if (!_studUser) return;

  renderPageHeader(_studUser);
  await loadStudClasses();
  bindStudEvents();
});

/* ============================================================
   Load Classes into Filter
   ============================================================ */

async function loadStudClasses() {
  const res = await API.listClasses();
  if (!res.ok) { showToast(res.message, 'error'); return; }

  _studClasses = res.data || [];
  const sel = $id('filter-class');
  sel.innerHTML = '<option value="">ทุกห้องเรียน</option>' +
    _studClasses.map(c =>
      `<option value="${escapeHtml(c.class_id)}">${escapeHtml(c.class_name)}</option>`
    ).join('');

  // Populate class selector in Add/Edit modal
  const addSel = $id('modal-class-id');
  if (addSel) {
    addSel.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>' +
      _studClasses.map(c =>
        `<option value="${escapeHtml(c.class_id)}">${escapeHtml(c.class_name)}</option>`
      ).join('');
  }

  loadStudents();
}

/* ============================================================
   Load Students
   ============================================================ */

async function loadStudents() {
  showLoading('กำลังโหลดรายชื่อ...');
  const search  = $id('search-student').value.trim();
  const classId = $id('filter-class').value;

  const res = await API.listStudents(classId, search);
  hideLoading();

  if (!res.ok) { showToast(res.message, 'error'); return; }

  _studStudents = res.data || [];
  renderStudentList();
}

/* ============================================================
   Render Student List
   ============================================================ */

function renderStudentList() {
  const container = $id('student-list');
  if (!container) return;

  if (_studStudents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-title">ไม่พบนักเรียน</div>
        <div class="empty-state-text">ลองเปลี่ยนตัวกรองหรือเพิ่มนักเรียนใหม่</div>
      </div>`;
    return;
  }

  $id('student-count-badge').textContent = `${_studStudents.length} คน`;

  container.innerHTML = _studStudents.map(s => {
    const initials = getInitials(s.first_name);
    const className = _studClasses.find(c => c.class_id === s.class_id)?.class_name || s.class_id;
    const activeLabel = (s.active === false || s.active === 'false' || s.active === '0')
      ? '<span class="badge badge-absent">ปิดใช้งาน</span>' : '';

    return `
      <div class="list-item" data-id="${escapeHtml(s.student_id)}">
        <div class="list-item-avatar">${escapeHtml(initials)}</div>
        <div class="list-item-content">
          <div class="list-item-title">
            ${escapeHtml(s.student_no ? `${s.student_no}. ` : '')}${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}
            ${activeLabel}
          </div>
          <div class="list-item-subtitle">
            ${escapeHtml(className)} · รหัส ${escapeHtml(s.student_code || '-')}
          </div>
        </div>
        <div class="list-item-action">
          <button class="btn btn-ghost btn-sm" onclick="openEditStudent('${escapeHtml(s.student_id)}')">แก้ไข</button>
        </div>
      </div>`;
  }).join('');
}

/* ============================================================
   Modal: Add / Edit Student
   ============================================================ */

function openAddStudent() {
  _editingStudent = null;
  $id('modal-student-title').textContent = 'เพิ่มนักเรียน';
  $id('student-form').reset();
  // Pre-select current class filter
  if (_studCurrentClass) {
    $id('modal-class-id').value = _studCurrentClass;
  }
  openModal('student-modal');
}

function openEditStudent(studentId) {
  const s = _studStudents.find(x => x.student_id === studentId);
  if (!s) return;
  _editingStudent = s;

  $id('modal-student-title').textContent = 'แก้ไขนักเรียน';
  $id('modal-class-id').value      = s.class_id || '';
  $id('modal-student-no').value    = s.student_no || '';
  $id('modal-student-code').value  = s.student_code || '';
  $id('modal-first-name').value    = s.first_name || '';
  $id('modal-last-name').value     = s.last_name || '';
  $id('modal-active').checked      = !(s.active === false || s.active === 'false' || s.active === '0');
  openModal('student-modal');
}

async function saveStudent() {
  const classId     = $id('modal-class-id').value.trim();
  const studentNo   = $id('modal-student-no').value.trim();
  const studentCode = $id('modal-student-code').value.trim();
  const firstName   = $id('modal-first-name').value.trim();
  const lastName    = $id('modal-last-name').value.trim();
  const active      = $id('modal-active').checked;

  if (!classId || !firstName || !lastName) {
    showToast('กรุณากรอกข้อมูลที่จำเป็น', 'warning');
    return;
  }

  showLoading('กำลังบันทึก...');

  let res;
  if (_editingStudent) {
    res = await API.updateStudent({
      student_id: _editingStudent.student_id,
      class_id: classId, student_no: studentNo,
      student_code: studentCode, first_name: firstName,
      last_name: lastName, active: active ? '1' : '0',
    });
  } else {
    res = await API.createStudent({
      class_id: classId, student_no: studentNo,
      student_code: studentCode, first_name: firstName,
      last_name: lastName,
    });
  }

  hideLoading();

  if (res.ok) {
    showToast(_editingStudent ? 'แก้ไขสำเร็จ' : 'เพิ่มนักเรียนสำเร็จ', 'success');
    closeModal('student-modal');
    loadStudents();
  } else {
    showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
  }
}

/* ============================================================
   CSV Import
   ============================================================ */

function openImportModal() {
  $id('import-form').reset();
  $id('import-preview').innerHTML = '';
  hideEl('import-preview-section');
  openModal('import-modal');
}

let _importData = [];

function onImportFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    _importData = parseCSV(ev.target.result);
    renderImportPreview();
  };
  reader.readAsText(file, 'utf-8');
}

function renderImportPreview() {
  const preview = $id('import-preview');
  if (!preview) return;

  if (_importData.length === 0) {
    preview.innerHTML = '<p class="text-danger">ไม่พบข้อมูลในไฟล์</p>';
    return;
  }

  showEl('import-preview-section');
  preview.innerHTML = `
    <p class="mb-sm"><strong>พบข้อมูล ${_importData.length} แถว</strong></p>
    <div class="list-card" style="max-height:200px;overflow-y:auto">
      ${_importData.slice(0, 10).map(row => `
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">${escapeHtml(row['เลขที่'] || row['student_no'] || '-')}. ${escapeHtml(row['ชื่อ'] || row['first_name'] || '')} ${escapeHtml(row['นามสกุล'] || row['last_name'] || '')}</div>
            <div class="list-item-subtitle">รหัส ${escapeHtml(row['รหัสนักเรียน'] || row['student_code'] || '-')}</div>
          </div>
        </div>`).join('')}
      ${_importData.length > 10 ? `<div class="list-item"><div class="list-item-content"><div class="list-item-subtitle">...และอีก ${_importData.length - 10} คน</div></div></div>` : ''}
    </div>`;
}

async function doImport() {
  const classId = $id('import-class-id').value;
  if (!classId) { showToast('กรุณาเลือกห้องเรียน', 'warning'); return; }
  if (_importData.length === 0) { showToast('ไม่มีข้อมูลที่จะนำเข้า', 'warning'); return; }

  // Normalize field names
  const normalized = _importData.map(row => ({
    student_no:   row['เลขที่']       || row['student_no']   || '',
    student_code: row['รหัสนักเรียน'] || row['student_code'] || '',
    first_name:   row['ชื่อ']         || row['first_name']   || '',
    last_name:    row['นามสกุล']      || row['last_name']    || '',
  })).filter(r => r.first_name || r.last_name);

  showLoading(`กำลังนำเข้า ${normalized.length} คน...`);
  const res = await API.importStudents(classId, normalized);
  hideLoading();

  if (res.ok) {
    showToast(`นำเข้าสำเร็จ ${res.data?.imported || normalized.length} คน`, 'success');
    closeModal('import-modal');
    loadStudents();
  } else {
    showToast(res.message || 'นำเข้าไม่สำเร็จ', 'error');
  }
}

/* ============================================================
   Event Bindings
   ============================================================ */

function bindStudEvents() {
  // Search with debounce
  $id('search-student').addEventListener('input', debounce(loadStudents, APP_CONFIG.SEARCH_DEBOUNCE));

  // Class filter
  $id('filter-class').addEventListener('change', () => {
    _studCurrentClass = $id('filter-class').value;
    loadStudents();
  });

  // Import file
  const importFile = $id('import-file');
  if (importFile) importFile.addEventListener('change', onImportFileChange);

  // Populate import class selector
  const importSel = $id('import-class-id');
  if (importSel) {
    importSel.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>' +
      _studClasses.map(c =>
        `<option value="${escapeHtml(c.class_id)}">${escapeHtml(c.class_name)}</option>`
      ).join('');
  }
}
