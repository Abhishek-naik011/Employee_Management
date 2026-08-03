const pool = require('../config/db');

exports.getAssignments = async (req, res) => {
    try {
        const { project_id } = req.query;
        let query = `
            SELECT
                a.assignment_id,
                a.employee_id,
                a.project_id,
                a.role,
                a.assigned_date,
                e.full_name,
                d.department_name AS department
            FROM assignments a
            JOIN employees e ON a.employee_id = e.employee_id
            LEFT JOIN departments d ON e.department_id = d.department_id
        `;
        let params = [];
        if (project_id) {
            query += ` WHERE a.project_id = $1`;
            params.push(project_id);
        }
        query += ` ORDER BY a.assignment_id;`;
        
        const result = await pool.query(query, params);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createAssignment = async (req, res) => {
    try {
        const { employee_id, project_id, role, assigned_date } = req.body;
        const query = `
            INSERT INTO assignments (employee_id, project_id, role, assigned_date)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await pool.query(query, [employee_id, project_id, role, assigned_date]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM assignments WHERE assignment_id = $1 RETURNING *;', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Assignment not found' });
        res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};
