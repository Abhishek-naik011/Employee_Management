const pool = require('../config/db');
const { calculateAttendanceDuration } = require('../utils/attendanceHelper');

exports.checkIn = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user.employee_id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Employee ID not found in session.' });
        }
        
        // Ensure not already checked in today
        const checkQuery = `SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = CURRENT_DATE`;
        const checkResult = await pool.query(checkQuery, [employeeId]);
        
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Already checked in today.' });
        }
        
        const insertQuery = `
            INSERT INTO attendance (employee_id, attendance_date, check_in_time, status)
            VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, 'Working')
            RETURNING *
        `;
        const result = await pool.query(insertQuery, [employeeId]);
        
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Check In error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.checkOut = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user.employee_id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Employee ID not found in session.' });
        }
        
        const updateQuery = `
            UPDATE attendance 
            SET 
                check_out_time = CURRENT_TIMESTAMP, 
                working_minutes = COALESCE(previous_working_minutes, 0) + (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(resume_start_time, check_in_time))) / 60),
                status = 'Completed'
            WHERE employee_id = $1 AND attendance_date = CURRENT_DATE AND status = 'Working'
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [employeeId]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'No active check-in found for today.' });
        }
        
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Check Out error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getToday = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user.employee_id;
        if (!employeeId) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Employee ID not found in session.' });
        }
        
        const query = `SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = CURRENT_DATE`;
        const result = await pool.query(query, [employeeId]);
        
        if (result.rows.length > 0) {
            res.status(200).json({ success: true, data: result.rows[0] });
        } else {
            res.status(200).json({ success: true, data: null });
        }
    } catch (error) {
        console.error('Get Today error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getAll = async (req, res) => {
    try {
        const { dateFilter, employeeId, departmentId, status } = req.query;
        
        let query = `
            SELECT a.*, e.full_name, e.employee_id AS emp_id, d.department_name,
                   ar.approved_by AS regularization_approved_by,
                   approver_emp.full_name AS regularization_approved_by_name,
                   ar.approved_at AS regularization_approved_on
        `;
        
        if (dateFilter === 'Today') {
            query += `
                FROM employees e
                LEFT JOIN attendance a ON a.employee_id = e.employee_id AND a.attendance_date = CURRENT_DATE
                LEFT JOIN departments d ON e.department_id = d.department_id
            `;
        } else {
            query += `
                FROM attendance a
                JOIN employees e ON a.employee_id = e.employee_id
                LEFT JOIN departments d ON e.department_id = d.department_id
            `;
        }
        
        query += `
            LEFT JOIN (
                SELECT attendance_id, MAX(approved_by) as approved_by, MAX(approved_at) as approved_at
                FROM attendance_regularizations
                WHERE status = 'Approved'
                GROUP BY attendance_id
            ) ar ON a.attendance_id = ar.attendance_id
            LEFT JOIN employees approver_emp ON ar.approved_by = approver_emp.employee_id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (dateFilter === 'Today') {
            query += ` AND e.status = 'Active'`;
        } else if (dateFilter === 'This Week') {
            query += ` AND a.attendance_date >= date_trunc('week', CURRENT_DATE)`;
        } else if (dateFilter === 'This Month') {
            query += ` AND a.attendance_date >= date_trunc('month', CURRENT_DATE)`;
        }
        
        if (employeeId) {
            query += ` AND e.employee_id = $${paramIndex++}`;
            params.push(employeeId);
        }
        
        if (departmentId) {
            query += ` AND e.department_id = $${paramIndex++}`;
            params.push(departmentId);
        }
        
        if (status) {
            if (status === 'Absent' && dateFilter === 'Today') {
                query += ` AND a.attendance_id IS NULL`;
            } else {
                query += ` AND a.status = $${paramIndex++}`;
                params.push(status);
            }
        }
        
        if (dateFilter === 'Today') {
            query += ` ORDER BY a.check_in_time DESC NULLS LAST, e.full_name ASC`;
        } else {
            query += ` ORDER BY a.attendance_date DESC, a.check_in_time DESC`;
        }
        
        const result = await pool.query(query, params);
        
        // Dynamic "Forgot Checkout" check for past dates and handling Absent mock data
        const mappedRows = result.rows.map(row => {
            if (!row.employee_id) {
                row.employee_id = row.emp_id;
            }
            if (!row.attendance_id) {
                // Mock properties for frontend so it doesn't crash
                row.status = 'Absent';
                row.attendance_date = new Date().toISOString();
                row.check_in_time = null;
                row.check_out_time = null;
                row.working_minutes = null;
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const rowDate = new Date(row.attendance_date);
                rowDate.setHours(0, 0, 0, 0);
                
                if (row.check_out_time === null && rowDate < today) {
                    row.status = 'Forgot Checkout';
                }
            }
            return row;
        });
        
        res.status(200).json({ success: true, data: mappedRows });
    } catch (error) {
        console.error('Get All error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.editAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { check_in_time, check_out_time } = req.body;
        
        // Fetch current record to get previous_working_minutes
        const currentRecRes = await pool.query('SELECT previous_working_minutes FROM attendance WHERE attendance_id = $1', [id]);
        if (currentRecRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Attendance record not found.' });
        }
        
        const previousMinutes = currentRecRes.rows[0].previous_working_minutes || 0;
        
        let workingMinutes = 0;
        let correctedCheckOut = check_out_time;

        if (check_in_time && check_out_time) {
            const calc = calculateAttendanceDuration(check_in_time, check_out_time, previousMinutes);
            workingMinutes = calc.workingMinutes;
            correctedCheckOut = calc.correctedCheckOut;
        }

        let updateQuery = `
            UPDATE attendance 
            SET 
                check_in_time = $1,
                check_out_time = $2,
                working_minutes = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE attendance_id = $4
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [check_in_time, correctedCheckOut, workingMinutes, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Attendance record not found.' });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Edit Attendance error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.resumeWork = async (req, res) => {
    try {
        const { id } = req.params;
        
        const updateQuery = `
            UPDATE attendance 
            SET 
                previous_working_minutes = COALESCE(working_minutes, 0),
                resume_start_time = CURRENT_TIMESTAMP,
                check_out_time = NULL,
                status = 'Working',
                updated_at = CURRENT_TIMESTAMP
            WHERE attendance_id = $1 AND status = 'Completed' AND check_out_time IS NOT NULL
            RETURNING *
        `;
        const result = await pool.query(updateQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Cannot resume work on this record.' });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Resume Work error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.forceCheckOut = async (req, res) => {
    try {
        const { id } = req.params;
        
        const updateQuery = `
            UPDATE attendance 
            SET 
                check_out_time = CURRENT_TIMESTAMP, 
                working_minutes = COALESCE(previous_working_minutes, 0) + (EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - COALESCE(resume_start_time, check_in_time))) / 60),
                status = 'Completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE attendance_id = $1 AND status = 'Working'
            RETURNING *
        `;
        const result = await pool.query(updateQuery, [id]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Cannot force check-out (record might already be completed).' });
        }
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Force Check Out error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const client = await pool.connect();
        
        // Total Employees
        const totalEmpRes = await client.query("SELECT COUNT(*) FROM employees WHERE status = 'Active'");
        const totalEmployees = parseInt(totalEmpRes.rows[0].count, 10);
        
        // Today's Attendance
        const todayRes = await client.query("SELECT * FROM attendance WHERE attendance_date = CURRENT_DATE");
        const todayAttendance = todayRes.rows;
        
        // Process
        const present = todayAttendance.length;
        const absent = totalEmployees - present;
        const currentlyWorking = todayAttendance.filter(a => a.status === 'Working').length;
        
        // Forgot Checkout: Status = Forgot Checkout (check_out_time IS NULL AND attendance_date < CURRENT_DATE)
        const forgotRes = await client.query("SELECT COUNT(*) FROM attendance WHERE check_out_time IS NULL AND attendance_date < CURRENT_DATE");
        const forgotCheckout = parseInt(forgotRes.rows[0].count, 10);
        
        client.release();
        
        res.status(200).json({
            success: true,
            data: {
                totalEmployees,
                present,
                absent,
                currentlyWorking,
                forgotCheckout
            }
        });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.generateReport = async (req, res) => {
  try {
    const {
      reportType,
      date,
      weekStart,
      month,
      year,
      customStart,
      customEnd,
      employeeScope,
      employeeId,
      department,
      status,
      format
    } = req.body;

    // Build dynamic WHERE clauses based on filters
    let whereClauses = [];
    const params = [];
    let idx = 1;

    // Date range handling
    const addDateCondition = (start, end) => {
      whereClauses.push(`a.attendance_date BETWEEN $${idx} AND $${idx + 1}`);
      params.push(start, end);
      idx += 2;
    };

    if (reportType === 'daily' && date) {
      const d = new Date(date);
      addDateCondition(d.toISOString().split('T')[0], d.toISOString().split('T')[0]);
    } else if (reportType === 'weekly' && weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      addDateCondition(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    } else if (reportType === 'monthly' && month && year) {
      const start = new Date(`${year}-${month}-01`);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      addDateCondition(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    } else if (reportType === 'yearly' && year) {
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31`);
      addDateCondition(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    } else if (reportType === 'custom' && customStart && customEnd) {
      addDateCondition(customStart, customEnd);
    }

    // Employee scope
    if (employeeScope === 'particular' && employeeId) {
      whereClauses.push(`a.employee_id = $${idx}`);
      params.push(employeeId);
      idx++;
    }

    // Department filter
    if (department && department !== 'All') {
      whereClauses.push(`d.department_name = $${idx}`);
      params.push(department);
      idx++;
    }

    // Status filter
    if (status && status !== 'All') {
      whereClauses.push(`a.status = $${idx}`);
      params.push(status);
      idx++;
    }

    // Base query
    let query = `
      SELECT a.*, e.full_name, e.employee_id, d.department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.employee_id
      LEFT JOIN departments d ON e.department_id = d.department_id
    `;
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    query += ' ORDER BY a.attendance_date DESC, a.check_in_time DESC';

    const result = await pool.query(query, params);
    const records = result.rows;

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: 'No attendance records found for the selected filters.' });
    }

    // Generate report via utility
    const { generateExcel, generatePDF } = require('../utils/reportGenerator');
    const meta = { reportType, month, year, customStart, customEnd, employeeId, department, status };
    let buffer, contentType, fileName;
    if (format === 'excel') {
      buffer = await generateExcel(records, meta);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileName = `Attendance_${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else {
      buffer = await generatePDF(records, meta);
      contentType = 'application/pdf';
      fileName = `Attendance_${reportType.charAt(0).toUpperCase() + reportType.slice(1)}_${new Date().toISOString().split('T')[0]}.pdf`;
    }

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename=${fileName}`
    });
    res.send(buffer);
  } catch (error) {
    console.error('Generate Report error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating report' });
  }
};

exports.getEmployeeStats = async (req, res) => {
  try {
    const employeeId = req.user.id || req.user.employee_id;
    if (!employeeId) {
       return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // 1. Get Today's Shift
    const todayQuery = `
      SELECT * FROM attendance 
      WHERE employee_id = $1 AND attendance_date = CURRENT_DATE
    `;
    const todayRes = await pool.query(todayQuery, [employeeId]);
    const todayShift = todayRes.rows[0] || null;

    // 2. Get This Month's Stats
    const monthQuery = `
      SELECT * FROM attendance 
      WHERE employee_id = $1 AND date_trunc('month', attendance_date) = date_trunc('month', CURRENT_DATE)
    `;
    const monthRes = await pool.query(monthQuery, [employeeId]);
    const monthRecords = monthRes.rows;

    let presentDays = monthRecords.length;
    // Calculate absent days based on workdays passed in month minus present days.
    // For simplicity, just count days passed in month excluding weekends, then subtract present days.
    const getWorkdaysInMonthToDate = () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      let count = 0;
      let d = new Date(start);
      while (d <= now) {
        if (d.getDay() !== 0 && d.getDay() !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    };
    
    const workdaysToDate = getWorkdaysInMonthToDate();
    let absentDays = Math.max(0, workdaysToDate - presentDays);
    
    let lateCheckIns = 0;
    let totalWorkingMinutes = 0;

    monthRecords.forEach(rec => {
      if (rec.working_minutes) totalWorkingMinutes += parseFloat(rec.working_minutes);
      
      // Determine if late (e.g., check_in_time > 09:15:00)
      if (rec.check_in_time) {
         const time = new Date(rec.check_in_time);
         const hrs = time.getHours();
         const mins = time.getMinutes();
         if (hrs > 9 || (hrs === 9 && mins > 15)) {
            lateCheckIns++;
         }
      }
    });

    const stats = {
      presentDays,
      absentDays,
      lateCheckIns,
      totalWorkingHours: totalWorkingMinutes
    };

    // 3. Get Weekly Chart (Mon-Sun for current week)
    const weekQuery = `
      SELECT attendance_date, working_minutes, status 
      FROM attendance 
      WHERE employee_id = $1 
      AND attendance_date >= date_trunc('week', CURRENT_DATE)
      AND attendance_date < date_trunc('week', CURRENT_DATE) + interval '7 days'
    `;
    const weekRes = await pool.query(weekQuery, [employeeId]);
    
    // Build array Mon-Sun
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Initialize 7 days with 0 minutes
    let weeklyChart = dayNames.map((name, i) => {
       const now = new Date();
       const day = now.getDay();
       const diff = now.getDate() - day + (day === 0 ? -6 : 1) + i;
       const d = new Date(now.setDate(diff));
       return {
         dayName: name,
         date: d.toISOString().split('T')[0],
         minutes: 0
       };
    });

    weekRes.rows.forEach(record => {
       // Fix timezone shift by extracting the exact date string
       let d;
       if (record.attendance_date instanceof Date) {
           // pg parses DATE columns as midnight local time. To get the YYYY-MM-DD correctly, adjust for timezone offset
           const tzOffset = record.attendance_date.getTimezoneOffset() * 60000;
           d = new Date(record.attendance_date.getTime() - tzOffset);
       } else {
           d = new Date(record.attendance_date);
       }
       
       const day = d.getUTCDay();
       const index = day === 0 ? 6 : day - 1;
       
       if (index >= 0 && index < 7) {
           // Sum minutes in case of multiple rows for the same day (e.g. before/after regularization)
           weeklyChart[index].minutes += parseFloat(record.working_minutes || 0);
           weeklyChart[index].date = d.toISOString().split('T')[0];
       }
    });

    // 4. Get History (Last 10)
    const historyQuery = `
      SELECT 
        a.*,
        ar.approved_at as "approvedAt",
        app_emp.full_name as "approvedByName",
        app_role.role_name as "approvedByRole"
      FROM attendance a
      LEFT JOIN (
          SELECT attendance_id, MAX(approved_by) as approved_by, MAX(approved_at) as approved_at
          FROM attendance_regularizations
          WHERE status = 'Approved'
          GROUP BY attendance_id
      ) ar ON a.attendance_id = ar.attendance_id
      LEFT JOIN employees app_emp ON ar.approved_by = app_emp.employee_id
      LEFT JOIN roles app_role ON app_emp.role_id = app_role.role_id
      WHERE a.employee_id = $1
      ORDER BY a.attendance_date DESC, a.check_in_time DESC
      LIMIT 10
    `;
    const historyRes = await pool.query(historyQuery, [employeeId]);
    
    res.status(200).json({
      success: true,
      data: {
        stats,
        todayShift,
        weeklyChart,
        history: historyRes.rows
      }
    });

  } catch (err) {
    console.error('getEmployeeStats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
