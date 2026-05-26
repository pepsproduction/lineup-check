/**
 * excel-export.js — LineUp Check
 * Standalone Excel export helpers using SheetJS (XLSX).
 * Imported only on pages that need it.
 * SheetJS is loaded via CDN in the HTML page.
 */

const ExcelExport = (() => {

  /**
   * Export attendance data to .xlsx
   * @param {Object} opts
   * @param {string} opts.className
   * @param {string} opts.date
   * @param {Object} opts.summary  — {present,late,leave,absent,pending,total}
   * @param {Array}  opts.students — attendance rows
   */
  function exportAttendance({ className, date, summary = {}, students = [] }) {
    if (typeof XLSX === 'undefined') {
      showToast('ไม่พบ SheetJS — กรุณาตรวจสอบอินเทอร์เน็ต', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();

    /* ---- Summary Sheet ---- */
    const summaryData = [
      ['LineUp Check — รายงานการเช็คชื่อ'],
      ['ห้องเรียน', className || ''],
      ['วันที่', date || today()],
      ['สร้างเมื่อ', new Date().toLocaleString('th-TH')],
      [],
      ['สถานะ', 'จำนวน (คน)'],
      ['✅ มา',         summary.present || 0],
      ['⏰ สาย',        summary.late    || 0],
      ['🔵 ลา',         summary.leave   || 0],
      ['❌ ขาด',        summary.absent  || 0],
      ['⭕ ยังไม่เช็ค', summary.pending || 0],
      ['รวมทั้งหมด',    summary.total   || 0],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 20 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    /* ---- Attendance Sheet ---- */
    const attRows = students.map(s => ({
      'เลขที่':       s.student_no     || '',
      'รหัสนักเรียน': s.student_code   || '',
      'ชื่อ':          s.first_name     || '',
      'นามสกุล':       s.last_name      || '',
      'สถานะ':         APP_CONFIG.STATUS_LABELS[s.status] || s.status || 'ยังไม่เช็ค',
      'เวลาสแกน':      s.scan_time      || '',
      'วิธีเช็ค':      s.method         || '',
      'หมายเหตุ':       s.note           || '',
    }));
    const attWs = XLSX.utils.json_to_sheet(attRows);
    attWs['!cols'] = [
      {wch:8},{wch:14},{wch:16},{wch:16},{wch:12},{wch:12},{wch:10},{wch:24}
    ];
    XLSX.utils.book_append_sheet(wb, attWs, 'Attendance');

    /* ---- Students Sheet ---- */
    if (students.length > 0) {
      const stuRows = students.map(s => ({
        'เลขที่':       s.student_no   || '',
        'รหัสนักเรียน': s.student_code || '',
        'ชื่อ':          s.first_name   || '',
        'นามสกุล':       s.last_name    || '',
        'QR Token':      s.qr_token     || '',
      }));
      const stuWs = XLSX.utils.json_to_sheet(stuRows);
      stuWs['!cols'] = [{wch:8},{wch:14},{wch:16},{wch:16},{wch:26}];
      XLSX.utils.book_append_sheet(wb, stuWs, 'Students');
    }

    const safeClass = (className || 'class').replace(/[\\/:*?"<>|]/g, '_');
    const fileName  = `LineUpCheck_${safeClass}_${date || today()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`บันทึกไฟล์ ${fileName}`, 'success');
  }

  /**
   * Export monthly summary to .xlsx
   */
  function exportMonthly({ className, year, month, rows = [] }) {
    if (typeof XLSX === 'undefined') {
      showToast('ไม่พบ SheetJS', 'error');
      return;
    }

    const wb = XLSX.utils.book_new();
    const thaiMonths = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                        'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

    const monthRows = rows.map(s => ({
      'เลขที่':       s.student_no   || '',
      'รหัสนักเรียน': s.student_code || '',
      'ชื่อ':          s.first_name   || '',
      'นามสกุล':       s.last_name    || '',
      'มา':           s.present      || 0,
      'สาย':          s.late         || 0,
      'ลา':           s.leave        || 0,
      'ขาด':          s.absent       || 0,
      'ยังไม่เช็ค':   s.pending      || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(monthRows);
    ws['!cols'] = [{wch:8},{wch:14},{wch:16},{wch:16},{wch:6},{wch:6},{wch:6},{wch:6},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly');

    const safeClass = (className || 'class').replace(/[\\/:*?"<>|]/g, '_');
    const fileName  = `LineUpCheck_Monthly_${safeClass}_${year}-${String(month).padStart(2,'0')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`บันทึกไฟล์ ${fileName}`, 'success');
  }

  return { exportAttendance, exportMonthly };
})();
