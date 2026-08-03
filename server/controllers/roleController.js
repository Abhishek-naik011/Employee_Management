const pool = require('../config/db');

// Get All Roles
exports.getRoles = async (req, res) => {
    try {
        const query = `
            SELECT
                r.role_id,
                r.role_name,
                r.description,
                'Active' AS status,
                r.permissions,
                r.created_at,
                COUNT(e.employee_id) AS employee_count
            FROM roles r
            LEFT JOIN employees e ON r.role_id = e.role_id
            GROUP BY r.role_id
            ORDER BY r.role_id;
        `;
        const result = await pool.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create Role
exports.createRole = async (req, res) => {
    try {
        const { role_name, description, status, permissions } = req.body;
        const query = `
            INSERT INTO roles (role_name, description, permissions)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const result = await pool.query(query, [role_name, description, permissions || '[]']);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Role
exports.updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_name, description, status, permissions } = req.body;
        const query = `
            UPDATE roles
            SET role_name = $1, description = $2, permissions = $3
            WHERE role_id = $4
            RETURNING *;
        `;
        const result = await pool.query(query, [role_name, description, permissions || '[]', id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Role not found' });
        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Role
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if employees are assigned to this role
        const checkQuery = 'SELECT COUNT(*) FROM employees WHERE role_id = $1';
        const checkResult = await pool.query(checkQuery, [id]);
        const count = parseInt(checkResult.rows[0].count, 10);

        if (count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Cannot delete this role because ${count} employee(s) are currently assigned to it. Please reassign them to a different role first.` 
            });
        }

        const result = await pool.query('DELETE FROM roles WHERE role_id = $1 RETURNING *;', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Role not found' });
        res.status(200).json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};
