/**
 * classes.js — LineUp Check
 * Class room management: list, add, edit, assign teacher.
 */

let _classUser    = null;
let _classTeachers = [];
let _classes      = [];
let _editingClass = null;

document.addEventListener('DOMContentLoaded', async () => {
  _classUser = await Auth.requireLogin();
  if (!_classUser) return;

  renderPageHeader(_classUser);

  // Only admin can add classes
  if (!Auth.canManageSystem(_classUser)) {
    hideEl('btn-add-class');
  }

  if (Auth.canManageSystem(_classUser)) {
    await loadTeachers();
  }

  await loadClasses();
  bindClassEvents();
});

async function loadTeachers() {
  const res = await API.listTeachers();
  if (res.ok) {
    _classTeachers = res.data || [];
    const sel = $id('modal-owner');
    if (sel) {
      sel.innerHTML = '<option value="">ไม่ระบุเจ้าของห้อง</option>' +
        _classTeachers.map(t =>
          `<option value="${escapeHtml(t.user_id)}">${escapeHtml(t.full_name)} (${escapeHtml(t.username)})</option>`
        ).join('');
    }
  }
}

async function loadClasses() {
  showLoading('กำลังโหลดห้องเรียน...');
  const res = await API.listClasses();
  hideLoading();

  if (!res.ok) { showToast(res.message, 'error'); return; }

  _classes = res.data || [];
  renderClasses();
}

function renderClasses() {
  const container = $id('class-list');
  const search = ($id('search-class')?.value || '').toLowerCase();

  let filtered = _classes;
  if (search) {
    filtered = _classes.filter(c =>
      c.class_name.toLowerCase().includes(search) ||
      (c.level || '').toLowerCase().includes(search) ||
      (c.room || '').toLowerCase().includes(search)
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏫</div>
        <div class="empty-state-title">ไม่พบห้องเรียน</div>
        <div class="empty-state-text">กดปุ่ม + เพื่อเพิ่มห้องเรียนใหม่</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const ownerName = _classTeachers.find(t => t.user_id === c.owner_user_id)?.full_name || 'ไม่ระบุ';
    const isActive = c.active !== false && c.active !== 'false' && c.active !== '0';

    return `
      <div class="card card-sm mb-md ${isActive ? '' : 'opacity-60'}">
        <div class="flex items-center justify-between">
          <div>
            <div style="font-size:18px;font-weight:700">${escapeHtml(c.class_name)}</div>
            <div class="text-secondary" style="font-size:14px">
              ${c.level ? `ระดับ ${escapeHtml(c.level)}` : ''}
              ${c.room  ? ` · ห้อง ${escapeHtml(c.room)}` : ''}
            </div>
            <div class="text-secondary" style="font-size:13px;margin-top:4px">
              ครูประจำชั้น: ${escapeHtml(ownerName)}
            </div>
          </div>
          <div class="flex gap-sm">
            ${!isActive ? '<span class="badge badge-absent">ปิด</span>' : '<span class="badge badge-present">เปิด</span>'}
            ${Auth.canManageStudents(_classUser)
              ? `<button class="btn btn-ghost btn-sm" onclick="openEditClass('${escapeHtml(c.class_id)}')">แก้ไข</button>`
              : ''}
          </div>
        </div>
      </div>`;
  }).join('');
}

function openAddClass() {
  _editingClass = null;
  $id('modal-class-title').textContent = 'เพิ่มห้องเรียน';
  $id('class-form').reset();
  $id('modal-active').checked = true;
  openModal('class-modal');
}

function openEditClass(classId) {
  const c = _classes.find(x => x.class_id === classId);
  if (!c) return;
  _editingClass = c;

  $id('modal-class-title').textContent = 'แก้ไขห้องเรียน';
  $id('modal-class-name').value = c.class_name || '';
  $id('modal-level').value      = c.level || '';
  $id('modal-room').value       = c.room || '';
  $id('modal-active').checked   = !(c.active === false || c.active === 'false' || c.active === '0');

  const ownerSel = $id('modal-owner');
  if (ownerSel) ownerSel.value = c.owner_user_id || '';

  openModal('class-modal');
}

async function saveClass() {
  const name   = $id('modal-class-name').value.trim();
  const level  = $id('modal-level').value.trim();
  const room   = $id('modal-room').value.trim();
  const owner  = $id('modal-owner')?.value || '';
  const active = $id('modal-active').checked;

  if (!name) { showToast('กรุณาใส่ชื่อห้องเรียน', 'warning'); return; }

  showLoading('กำลังบันทึก...');

  let res;
  if (_editingClass) {
    res = await API.updateClass({
      class_id: _editingClass.class_id,
      class_name: name, level, room,
      owner_user_id: owner,
      active: active ? '1' : '0',
    });
  } else {
    res = await API.createClass({ class_name: name, level, room, owner_user_id: owner });
  }

  hideLoading();

  if (res.ok) {
    showToast(_editingClass ? 'แก้ไขสำเร็จ' : 'เพิ่มห้องเรียนสำเร็จ', 'success');
    closeModal('class-modal');
    loadClasses();
  } else {
    showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
  }
}

function bindClassEvents() {
  const searchEl = $id('search-class');
  if (searchEl) {
    searchEl.addEventListener('input', debounce(renderClasses, 300));
  }
}
