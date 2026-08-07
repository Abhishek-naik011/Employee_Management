// server/utils/reportGenerator.js

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');
const { PassThrough } = require('stream');

/**
 * Generate an Excel workbook buffer from attendance records.
 * @param {Array} records - Attendance rows from DB.
 * @param {Object} meta - Reserved for future metadata.
 * @returns {Promise<Buffer>}
 */
async function generateExcel(records, meta) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance');
  sheet.columns = [
    { header: 'Employee Name', key: 'full_name', width: 25 },
    { header: 'Employee ID', key: 'employee_id', width: 12 },
    { header: 'Department', key: 'department_name', width: 18 },
    { header: 'Attendance Date', key: 'attendance_date', width: 15 },
    { header: 'Check In', key: 'check_in_time', width: 12 },
    { header: 'Check Out', key: 'check_out_time', width: 12 },
    { header: 'Working Hours', key: 'working_hours', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Forgot Checkout', key: 'forgot_checkout', width: 15 },
    { header: 'Resume Count', key: 'resume_count', width: 15 },
    { header: 'Edited By Admin', key: 'edited_by_admin', width: 18 }
  ];
// Apply header styling: bold, blue background, white text
const headerRow = sheet.getRow(1);
headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  records.forEach(rec => {
    const checkIn = rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
    const checkOut = rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
    const workingHours = rec.working_minutes ? `${Math.floor(rec.working_minutes / 60)}h ${rec.working_minutes % 60}m` : '--';
    sheet.addRow({
      full_name: rec.full_name,
      employee_id: rec.employee_id,
      department_name: rec.department_name || 'N/A',
      attendance_date: new Date(rec.attendance_date).toLocaleDateString(),
      check_in_time: checkIn,
      check_out_time: checkOut,
      working_hours: workingHours,
      status: rec.status,
      forgot_checkout: rec.forgot_checkout ? 'Yes' : 'No',
      resume_count: rec.resume_count || 0,
      edited_by_admin: rec.edited_by_admin ? 'Yes' : 'No'
    });
  });

  // Simple border styling
  sheet.eachRow(row => {
    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  return workbook.xlsx.writeBuffer();
}

/**
 * Generate a PDF buffer from attendance records.
 * @param {Array} records
 * @param {Object} meta
 * @returns {Promise<Buffer>}
 */
function generatePDF(records, meta) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', err => reject(err));
    doc.pipe(stream);

    // Title & Header Info
    doc.fontSize(18).text('Company Name', { align: 'center' });
    doc.fontSize(14).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`);
    let filterStr = `Period: ${meta?.reportType || 'N/A'}`;
    if (meta?.reportType === 'daily' && meta.date) filterStr += ` (${meta.date})`;
    if (meta?.employeeScope === 'particular') filterStr += ` | Employee ID: ${meta.employeeId}`;
    if (meta?.department && meta.department !== 'All') filterStr += ` | Dept: ${meta.department}`;
    doc.text(`Applied Filters: ${filterStr}`);
    doc.text(`Total Records: ${records.length}`);
    doc.moveDown();

    const headers = [
      'Name', 'ID', 'Dept', 'Date', 'In', 'Out', 'Hours', 'Status', 'Forgot Out', 'Resumes', 'Edited'
    ];

    const tableData = {
      headers: headers,
      rows: records.map(rec => {
        const checkIn = rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
        const checkOut = rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
        const workingHours = rec.working_minutes ? `${Math.floor(rec.working_minutes / 60)}h ${rec.working_minutes % 60}m` : '--';
        
        return [
          rec.full_name || '--',
          rec.employee_id || '--',
          rec.department_name || '--',
          new Date(rec.attendance_date).toLocaleDateString(),
          checkIn,
          checkOut,
          workingHours,
          rec.status || '--',
          rec.forgot_checkout ? 'Yes' : 'No',
          String(rec.resume_count || 0),
          rec.edited_by_admin ? 'Yes' : 'No'
        ];
      })
    };

    try {
      await doc.table(tableData, {
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9),
        prepareRow: () => doc.font("Helvetica").fontSize(8)
      });
    } catch (err) {
      console.error('pdfkit-table error in attendance report:', err);
    }

    doc.end();
  });
}

/**
 * Generate generic Excel
 */
async function generateGenericExcel(records, reportCategory) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(reportCategory || 'Report');
  if (!records || records.length === 0) return workbook.xlsx.writeBuffer();
  
  const headers = Object.keys(records[0]);
  sheet.columns = headers.map(h => ({ header: h.replace(/_/g, ' ').toUpperCase(), key: h, width: 20 }));
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E90FF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  records.forEach(rec => sheet.addRow(rec));
  
  sheet.eachRow(row => {
    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });

  return workbook.xlsx.writeBuffer();
}

/**
 * Generate generic PDF
 */
function generateGenericPDF(records, reportCategory) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const stream = new PassThrough();
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', err => reject(err));
    doc.pipe(stream);

    doc.fontSize(18).text(reportCategory || 'Report', { align: 'center' });
    doc.moveDown();

    if (!records || records.length === 0) {
       doc.fontSize(12).text('No records found.', { align: 'center' });
       doc.end();
       return;
    }
    
    const headers = Object.keys(records[0]).slice(0, 8); // limit columns to fit
    
    const tableData = {
       headers: headers.map(h => String(h).replace(/_/g, ' ').toUpperCase()),
       rows: records.map(rec => headers.map(h => {
           let val = rec[h];
           if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
           return String(val || '--');
       }))
    };
    
    try {
      await doc.table(tableData, { 
         prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
         prepareRow: () => doc.font("Helvetica").fontSize(9)
      });
    } catch (err) {
      console.error('pdfkit-table error:', err);
    }
    
    doc.end();
  });
}

module.exports = { generateExcel, generatePDF, generateGenericExcel, generateGenericPDF };
