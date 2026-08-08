const pool = require('../config/db');
const { calculateAttendanceDuration } = require('../utils/attendanceHelper');

exports.createRequest = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const {
      attendance_date,
      issue_type,
      current_check_in,
      current_check_out,
      requested_check_in,
      requested_check_out,
      reason
    } = req.body;

    let attendanceRes = await pool.query('SELECT attendance_id FROM attendance WHERE employee_id = $1 AND attendance_date = $2', [employeeId, attendance_date]);
    let attendance_id;
    
    if (attendanceRes.rows.length > 0) {
      attendance_id = attendanceRes.rows[0].attendance_id;
    } else {
      // Create a blank attendance record to link the regularization
      const insertAtt = await pool.query(`
        INSERT INTO attendance (employee_id, attendance_date, status) 
        VALUES ($1, $2, 'Absent') RETURNING attendance_id
      `, [employeeId, attendance_date]);
      attendance_id = insertAtt.rows[0].attendance_id;
    }

    const query = `
      INSERT INTO attendance_regularizations 
      (attendance_id, employee_id, issue_type, current_check_in, current_check_out, requested_check_in, requested_check_out, reason, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')
      RETURNING *;
    `;
    const formatTime = (timeStr) => {
      if (!timeStr) return null;
      return `${attendance_date} ${timeStr}:00`;
    };

    const values = [
      attendance_id,
      employeeId,
      issue_type,
      formatTime(current_check_in),
      formatTime(current_check_out),
      formatTime(requested_check_in),
      formatTime(requested_check_out),
      reason
    ];

    const result = await pool.query(query, values);

    res.status(201).json({ success: true, data: result.rows[0], message: 'Regularization request submitted successfully' });
  } catch (error) {
    console.error('Create regularization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getEmployeeRequests = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const query = `
      SELECT r.*, r.id AS regularization_id, e.full_name, a.attendance_date
      FROM attendance_regularizations r
      JOIN employees e ON r.employee_id = e.employee_id
      JOIN attendance a ON r.attendance_id = a.attendance_id
      WHERE r.employee_id = $1
      ORDER BY r.id DESC;
    `;
    const result = await pool.query(query, [employeeId]);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get employee regularizations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const query = `
      SELECT r.*, r.id AS regularization_id, e.full_name, a.attendance_date
      FROM attendance_regularizations r
      JOIN employees e ON r.employee_id = e.employee_id
      JOIN attendance a ON r.attendance_id = a.attendance_id
      ORDER BY r.id DESC;
    `;
    const result = await pool.query(query);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all regularizations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // Get the request
    const reqRes = await pool.query(`
      SELECT r.*, a.attendance_date 
      FROM attendance_regularizations r
      JOIN attendance a ON r.attendance_id = a.attendance_id
      WHERE r.id = $1
    `, [id]);
    const request = reqRes.rows[0];
    if (!request) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (request.status !== 'Pending') {
      await pool.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }
    
    // Update attendance table or insert if doesn't exist
    const getYYYYMMDD = (val) => {
      if (!val) return null;
      if (typeof val === 'string') return val.split('T')[0].split(' ')[0];
      const d = new Date(val);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const attDateStr = getYYYYMMDD(request.attendance_date);
    // Let's check if attendance record exists using the exact YYYY-MM-DD string
    const attRes = await pool.query('SELECT * FROM attendance WHERE employee_id = $1 AND attendance_date = $2', [request.employee_id, attDateStr]);

    const getHHMMSS = (val) => {
      if (!val) return null;
      if (typeof val === 'string' && val.length <= 8) {
        return val.length === 5 ? `${val}:00` : val;
      }
      const d = new Date(val);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
    };

    const inTimeStr = getHHMMSS(request.requested_check_in);
    const outTimeStr = getHHMMSS(request.requested_check_out);

    const checkIn = inTimeStr ? `${attDateStr} ${inTimeStr}` : null;
    const checkOut = outTimeStr ? `${attDateStr} ${outTimeStr}` : null;
    
    // Calculate working minutes and get corrected check-out safely
    let workingMinutes = 0;
    let correctedCheckOut = checkOut;
    let status = 'Absent';

    if (checkIn && checkOut) {
      const calcResult = calculateAttendanceDuration(checkIn, checkOut);
      workingMinutes = calcResult.workingMinutes;
      correctedCheckOut = calcResult.correctedCheckOut;
      status = 'Completed';
    } else if (checkIn) {
      status = 'Working';
    }
    
    if (attRes.rows.length > 0) {
      // Update
      const attId = attRes.rows[0].attendance_id;
      const upQuery = `
        UPDATE attendance 
        SET check_in_time = $1, check_out_time = $2, working_minutes = $3, status = $4, updated_at = CURRENT_TIMESTAMP
        WHERE attendance_id = $5
      `;
      await pool.query(upQuery, [checkIn, correctedCheckOut, workingMinutes, status, attId]);
    } else {
      // Insert
      const inQuery = `
        INSERT INTO attendance (employee_id, attendance_date, check_in_time, check_out_time, working_minutes, status)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await pool.query(inQuery, [request.employee_id, attDateStr, checkIn, correctedCheckOut, workingMinutes, status]);
    }
    
    // Mark as Approved
    const updateReq = `
      UPDATE attendance_regularizations
      SET status = 'Approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await pool.query(updateReq, [req.user.id, id]);
    
    await pool.query('COMMIT');
    res.status(200).json({ success: true, message: 'Request approved and attendance updated' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Approve regularization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateReq = `
      UPDATE attendance_regularizations
      SET status = 'Rejected'
      WHERE id = $1 AND status = 'Pending'
      RETURNING *;
    `;
    const result = await pool.query(updateReq, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found or already processed' });
    }
    
    res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Reject regularization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
