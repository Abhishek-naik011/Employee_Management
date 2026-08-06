const pool = require('../config/db');
const {
    generateTemporaryPassword,
    setEmployeeTemporaryPassword,
    syncEmployeeAuthEmail
} = require('../utils/authAccounts');

// ===============================
// Get All Employees
// ===============================
exports.getEmployees = async (req, res) => {
    try {
        const query = `
            SELECT
                e.employee_id,
                e.full_name,
                e.email,
                e.phone,
                e.designation,
                e.joining_date,
                e.status,
                e.salary,
                e.department_id,
                e.role_id,
                d.department_name,
                r.role_name,
                a.first_login,
                a.password_changed,
                CASE WHEN a.password_hash IS NULL THEN FALSE ELSE TRUE END AS has_password,
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'project_id', p.project_id,
                        'project_name', p.project_name,
                        'start_date', p.start_date,
                        'end_date', p.end_date
                     ))
                     FROM assignments a
                     JOIN projects p ON a.project_id = p.project_id
                     WHERE a.employee_id = e.employee_id),
                    '[]'::json
                ) AS assigned_projects
            FROM employees e
            LEFT JOIN departments d
                ON e.department_id = d.department_id
            LEFT JOIN roles r
                ON e.role_id = r.role_id
            LEFT JOIN employee_auth_accounts a
                ON e.employee_id = a.employee_id
            ORDER BY e.employee_id DESC;
        `;

        const result = await pool.query(query);

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('getEmployees error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Get Current Logged-in Employee (ME)
// ===============================
exports.getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT 
                e.*,
                d.department_name,
                r.role_name,
                r.permissions,
                a.first_login,
                a.password_changed,
                CASE WHEN a.password_hash IS NULL THEN FALSE ELSE TRUE END AS has_password,
                COALESCE(
                    (SELECT json_agg(json_build_object(
                        'project_id', p.project_id,
                        'project_name', p.project_name,
                        'client_name', p.client_name,
                        'status', p.status,
                        'start_date', p.start_date,
                        'end_date', p.end_date,
                        'manager_name', (
                            SELECT e2.full_name
                            FROM assignments a2
                            JOIN employees e2 ON e2.employee_id = a2.employee_id
                            WHERE a2.project_id = p.project_id
                              AND (a2.role ILIKE '%manager%' OR e2.role_id = e.role_id)
                            ORDER BY a2.assignment_id
                            LIMIT 1
                        )
                     ))
                     FROM assignments a
                     JOIN projects p ON a.project_id = p.project_id
                     WHERE a.employee_id = e.employee_id),
                    '[]'::json
                ) AS assigned_projects
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.department_id
            LEFT JOIN roles r ON e.role_id = r.role_id
            LEFT JOIN employee_auth_accounts a ON e.employee_id = a.employee_id
            WHERE e.employee_id = $1
        `;

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ===============================
// Update Self Profile
// ===============================
exports.updateMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, phone, location } = req.body;

        const query = `
            UPDATE employees 
            SET full_name = $1, email = $2, phone = $3, location = $4
            WHERE employee_id = $5
            RETURNING *
        `;
        const result = await pool.query(query, [full_name, email, phone, location, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('updateMe error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ===============================
// Update Self Password
// ===============================
exports.updateMyPassword = async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
        }

        const bcrypt = require('bcrypt');
        const result = await client.query('SELECT password_hash FROM employee_auth_accounts WHERE employee_id = $1', [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const employee = result.rows[0];
        const isMatch = await bcrypt.compare(currentPassword, employee.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await client.query('BEGIN');
        
        await client.query(
            'UPDATE employees SET password_hash = $1 WHERE employee_id = $2',
            [newPasswordHash, userId]
        );
        
        const updateResult = await client.query(
            'UPDATE employee_auth_accounts SET password_hash = $1, password_changed = TRUE, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2 RETURNING employee_id',
            [newPasswordHash, userId]
        );
        
        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({ success: false, message: 'Failed to update password' });
        }
        
        await client.query('COMMIT');

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('updateMyPassword error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        client.release();
    }
};
// ===============================
// Create Employee
// ===============================
exports.createEmployee = async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone,
            designation,
            department_id,
            role_id,
            joining_date,
            status,
            salary
        } = req.body;
        const client = await pool.connect();
        const temporaryPassword = req.body.temporary_password || generateTemporaryPassword();

        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO employees
                (
                    full_name,
                    email,
                    phone,
                    designation,
                    department_id,
                    role_id,
                    joining_date,
                    status,
                    salary
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING *;
            `;

            const result = await client.query(query, [
                full_name,
                email,
                phone || null,
                designation || null,
                department_id || null,
                role_id || null,
                joining_date || null,
                status || 'Active',
                salary || 0
            ]);

            const createdEmployee = result.rows[0];
            const passwordResult = await setEmployeeTemporaryPassword(client, {
                employeeId: createdEmployee.employee_id,
                email: createdEmployee.email,
                temporaryPassword,
                firstLogin: true,
                passwordChanged: false
            });

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Employee created successfully',
                data: createdEmployee,
                temporaryPassword: passwordResult.temporaryPassword
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('createEmployee error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Update Employee
// ===============================
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            full_name,
            email,
            phone,
            designation,
            department_id,
            role_id,
            joining_date,
            status,
            salary
        } = req.body;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const query = `
                UPDATE employees
                SET
                    full_name = $1,
                    email = $2,
                    phone = $3,
                    designation = $4,
                    department_id = $5,
                    role_id = $6,
                    joining_date = $7,
                    status = $8,
                    salary = $9
                WHERE employee_id = $10
                RETURNING *;
            `;

            const result = await client.query(query, [
                full_name,
                email,
                phone || null,
                designation || null,
                department_id || null,
                role_id || null,
                joining_date || null,
                status || 'Active',
                salary || 0,
                id
            ]);

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }

            await syncEmployeeAuthEmail(client, { employeeId: id, email });
            await client.query('COMMIT');

            res.status(200).json({
                success: true,
                message: 'Employee updated successfully',
                data: result.rows[0]
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('updateEmployee error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Generate or Reset Employee Password
// ===============================
exports.generateEmployeePassword = async (req, res) => {
    try {
        const { id } = req.params;

        const employeeQuery = await pool.query(
            'SELECT employee_id, email FROM employees WHERE employee_id = $1',
            [id]
        );

        if (employeeQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        const employee = employeeQuery.rows[0];
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const passwordResult = await setEmployeeTemporaryPassword(client, {
                employeeId: employee.employee_id,
                email: employee.email,
                temporaryPassword: req.body.temporary_password,
                firstLogin: true,
                passwordChanged: false
            });

            await client.query('COMMIT');

            res.status(200).json({
                success: true,
                message: 'Password reset successfully',
                temporaryPassword: passwordResult.temporaryPassword
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('generateEmployeePassword error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Delete Employee
// ===============================
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            DELETE FROM employees
            WHERE employee_id = $1
            RETURNING *;
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee deleted successfully'
        });

    } catch (error) {
        console.error('deleteEmployee error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ===============================
// Update Salary
// ===============================
exports.updateSalary = async (req, res) => {
    try {
        const { id } = req.params;
        const { salary } = req.body;

        const result = await pool.query(
            `
            UPDATE employees
            SET salary = $1
            WHERE employee_id = $2
            RETURNING *;
            `,
            [salary, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Salary updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('updateSalary error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};