const pool = require('../config/db');

// ===============================
// Get All Departments
// ===============================
exports.getDepartments = async (req, res) => {
    try {
        const query = `
            SELECT
                d.department_id,
                d.department_name,
                d.department_code,
                d.department_head,
                d.description,
                d.created_at,
                COUNT(e.employee_id) AS count
            FROM departments d
            LEFT JOIN employees e
                ON d.department_id = e.department_id
            GROUP BY
                d.department_id,
                d.department_name,
                d.department_code,
                d.department_head,
                d.description,
                d.created_at
            ORDER BY d.department_id;
        `;

        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Create Department
// ===============================
exports.createDepartment = async (req, res) => {
    try {
        const {
            department_name,
            department_code,
            department_head,
            description
        } = req.body;

        const query = `
            INSERT INTO departments
            (
                department_name,
                department_code,
                department_head,
                description
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;

        const result = await pool.query(query, [
            department_name,
            department_code,
            department_head,
            description
        ]);

        res.status(201).json({
            success: true,
            message: "Department created successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Update Department
// ===============================
exports.updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            department_name,
            department_code,
            department_head,
            description
        } = req.body;

        const query = `
            UPDATE departments
            SET
                department_name = $1,
                department_code = $2,
                department_head = $3,
                description = $4
            WHERE department_id = $5
            RETURNING *;
        `;

        const result = await pool.query(query, [
            department_name,
            department_code,
            department_head,
            description,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Department updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Delete Department
// ===============================
exports.deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM departments
             WHERE department_id = $1
             RETURNING *;`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Department deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};