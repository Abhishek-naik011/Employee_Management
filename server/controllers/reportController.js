const pool = require('../config/db');
const { generateGenericExcel, generateGenericPDF } = require('../utils/reportGenerator');

// ── PDF display-only formatting helpers (values are NOT stored back to DB) ──
const _fmtDate = (val) => {
    if (!val) return '--';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '--';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const _fmtTime = (val) => {
    if (!val) return '--';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '--';
    let h = d.getUTCHours();
    const m = String(d.getUTCMinutes()).padStart(2,'0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2,'0')}:${m} ${ampm}`;
};
const _fmtMins = (val) => {
    const mins = parseFloat(val);
    if (val === null || val === undefined || isNaN(mins) || mins < 0) return '--';
    if (mins === 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
};
// ────────────────────────────────────────────────────────────────────────────

exports.generateGenericReport = async (req, res) => {
    try {
        const { reportCategory, format, scope, selectedId } = req.body;
        let query = '';
        let params = [];

        if (reportCategory === 'Employees Report' || reportCategory === 'Overall Company Report') {
            query = `
                SELECT 
                    e.employee_id as "Employee ID", 
                    e.full_name as "Full Name", 
                    e.email as "Email", 
                    e.phone as "Phone", 
                    d.department_name as "Department", 
                    r.role_name as "Role", 
                    e.status as "Status"
                FROM employees e
                LEFT JOIN departments d ON e.department_id = d.department_id
                LEFT JOIN roles r ON e.role_id = r.role_id
            `;
            if (scope === 'particular' && selectedId) {
                query += ` WHERE e.employee_id = $1`;
                params.push(selectedId);
            }
        } else if (reportCategory === 'Departments Report') {
            query = `SELECT department_id, department_name, description FROM departments`;
            if (scope === 'particular' && selectedId) {
                query += ` WHERE department_id = $1`;
                params.push(selectedId);
            }
        } else if (reportCategory === 'Roles Report') {
            query = `SELECT role_id, role_name, description FROM roles`;
            if (scope === 'particular' && selectedId) {
                query += ` WHERE role_id = $1`;
                params.push(selectedId);
            }
        } else if (reportCategory === 'Projects Report') {
            query = `SELECT project_id, project_name, client_name, status FROM projects`;
            if (scope === 'particular' && selectedId) {
                query += ` WHERE project_id = $1`;
                params.push(selectedId);
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid report category' });
        }

        const result = await pool.query(query, params);
        const records = result.rows;

        let buffer;
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        const contentType = format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';
        const fileName = `${reportCategory.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${ext}`;

        if (format === 'excel') {
            buffer = await generateGenericExcel(records, reportCategory);
        } else {
            buffer = await generateGenericPDF(records, reportCategory);
        }

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename=${fileName}`
        });
        res.send(buffer);
    } catch (error) {
        console.error('Generate Generic Report error:', error);
        res.status(500).json({ success: false, message: 'Server error while generating report' });
    }
};

exports.generateMyReport = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user.employee_id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { reportCategory, format } = req.body;
        let records = [];

        const getProfile = async () => {
            const query = `
                SELECT 
                    e.employee_id as "Employee ID", 
                    e.full_name as "Full Name", 
                    e.email as "Email", 
                    e.phone as "Phone", 
                    d.department_name as "Department", 
                    r.role_name as "Role", 
                    e.joining_date as "Joining Date",
                    e.status as "Status"
                FROM employees e
                LEFT JOIN departments d ON e.department_id = d.department_id
                LEFT JOIN roles r ON e.role_id = r.role_id
                WHERE e.employee_id = $1
            `;
            const result = await pool.query(query, [employeeId]);
            return result.rows[0];
        };

        const getAttendance = async () => {
            const query = `
                SELECT 
                    attendance_date as "Date", 
                    check_in_time as "Check In", 
                    check_out_time as "Check Out", 
                    working_minutes as "Working Minutes", 
                    status as "Status"
                FROM attendance
                WHERE employee_id = $1
                ORDER BY attendance_date DESC
                LIMIT 30
            `;
            const result = await pool.query(query, [employeeId]);
            return result.rows;
        };

        const getProjects = async () => {
            const query = `
                SELECT 
                    p.project_name as "Project", 
                    p.status as "Status", 
                    p.start_date as "Start Date", 
                    p.end_date as "End Date",
                    m.full_name as "Project Manager"
                FROM projects p
                LEFT JOIN employees m ON p.manager_id = m.employee_id
                WHERE p.assigned_employees::jsonb @> $1::jsonb
            `;
            const result = await pool.query(query, [JSON.stringify(employeeId)]);
            return result.rows;
        };

        if (reportCategory === 'My Profile Report') {
            const profile = await getProfile();
            if (profile) records.push(profile);
        } else if (reportCategory === 'My Attendance Report') {
            // Format raw timestamps before writing into the PDF — DB values are unchanged
            records = (await getAttendance()).map(row => ({
                "Date":          _fmtDate(row["Date"]),
                "Check In":      _fmtTime(row["Check In"]),
                "Check Out":     _fmtTime(row["Check Out"]),
                "Working Hours": _fmtMins(row["Working Minutes"]),
                "Status":        row["Status"] || '--'
            }));
        } else if (reportCategory === 'My Assigned Projects Report') {
            records = await getProjects();
        } else if (reportCategory === 'My Complete Employee Report') {
            const profile = await getProfile();
            const attendance = await getAttendance();
            const projects = await getProjects();

            // Format into generic records
            if (profile) {
                records.push({ "Section": "PROFILE", "Info 1": profile["Full Name"], "Info 2": profile["Email"], "Info 3": profile["Department"], "Info 4": profile["Role"] });
            }
            if (attendance.length > 0) {
                records.push({ "Section": "ATTENDANCE (Recent)", "Info 1": "Records:", "Info 2": String(attendance.length), "Info 3": "", "Info 4": "" });
                attendance.slice(0, 5).forEach(a => {
                    records.push({ "Section": "", "Info 1": new Date(a["Date"]).toLocaleDateString(), "Info 2": a["Status"], "Info 3": a["Working Minutes"] ? `${Math.floor(a["Working Minutes"] / 60)}h ${a["Working Minutes"] % 60}m` : "", "Info 4": "" });
                });
            }
            if (projects.length > 0) {
                records.push({ "Section": "PROJECTS", "Info 1": "Total:", "Info 2": String(projects.length), "Info 3": "", "Info 4": "" });
                projects.forEach(p => {
                    records.push({ "Section": "", "Info 1": p["Project"], "Info 2": p["Status"], "Info 3": p["Project Manager"], "Info 4": "" });
                });
            }
        } else {
            return res.status(400).json({ success: false, message: 'Invalid report category' });
        }

        let buffer;
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        const contentType = format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';
        const fileName = `${reportCategory.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${ext}`;

        if (format === 'excel') {
            buffer = await generateGenericExcel(records, reportCategory);
        } else {
            buffer = await generateGenericPDF(records, reportCategory);
        }

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename=${fileName}`
        });
        res.send(buffer);
    } catch (error) {
        console.error('Generate My Report error:', error);
        res.status(500).json({ success: false, message: 'Server error while generating report' });
    }
};
