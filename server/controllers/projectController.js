const pool = require('../config/db');

// ===============================
// Get All Projects
// ===============================
exports.getProjects = async (req, res) => {
    try {
        const isAdmin = req.user.role_name === 'Admin';
        const employeeId = req.user.id;
        
        let whereClause = '';
        let queryParams = [];

        const query = `
            SELECT
                p.project_id,
                p.project_name,
                p.project_code,
                p.client_name,
                p.start_date,
                p.end_date,
                p.status,
                p.created_at,
                COUNT(a.assignment_id) AS members
            FROM projects p
            LEFT JOIN assignments a ON p.project_id = a.project_id
            ${whereClause}
            GROUP BY
                p.project_id,
                p.project_name,
                p.project_code,
                p.client_name,
                p.start_date,
                p.end_date,
                p.status,
                p.created_at
            ORDER BY p.project_id;
        `;

        const result = await pool.query(query, queryParams);

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('getProjects error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Create Project
// ===============================
exports.createProject = async (req, res) => {
    try {
        const {
            project_name,
            project_code,
            client_name,
            start_date,
            end_date,
            status
        } = req.body;

        const query = `
            INSERT INTO projects
            (project_name, project_code, client_name, start_date, end_date, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const result = await pool.query(query, [
            project_name,
            project_code,
            client_name || null,
            start_date || null,
            end_date || null,
            status || 'Active'
        ]);

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            data: { ...result.rows[0], members: 0 }
        });

    } catch (error) {
        console.error('createProject error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Update Project
// ===============================
exports.updateProject = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            project_name,
            project_code,
            client_name,
            start_date,
            end_date,
            status
        } = req.body;

        const query = `
            UPDATE projects
            SET
                project_name = $1,
                project_code = $2,
                client_name  = $3,
                start_date   = $4,
                end_date     = $5,
                status       = $6
            WHERE project_id = $7
            RETURNING *;
        `;

        const result = await pool.query(query, [
            project_name,
            project_code,
            client_name || null,
            start_date || null,
            end_date || null,
            status || 'Active',
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('updateProject error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Delete Project
// ===============================
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM projects
             WHERE project_id = $1
             RETURNING *;`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });

    } catch (error) {
        console.error('deleteProject error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
