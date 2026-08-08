const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
    setEmployeeTemporaryPassword
} = require('../utils/authAccounts');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';

// ===============================
// Login (Admin + Employee)
// ===============================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        console.log(`\n--- LOGIN DEBUG ---`);
        console.log(`Email received: ${email}`);

        const query = `
            SELECT
                e.employee_id,
                e.full_name,
                e.email,
                e.status,
                e.role_id,
                r.role_name,
                r.permissions,
                a.password_hash,
                a.first_login,
                a.password_changed
            FROM employees e
            LEFT JOIN employee_auth_accounts a ON e.employee_id = a.employee_id
            LEFT JOIN roles r ON e.role_id = r.role_id
            WHERE e.email = $1
        `;
        const result = await pool.query(query, [email]);

        console.log(`User found in database: ${result.rows.length > 0}`);

        if (result.rows.length === 0) {
            console.log(`Response returned: Invalid credentials (no user)`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const employee = result.rows[0];

        if (employee.status !== 'Active') {
            console.log(`Response returned: Account inactive`);
            return res.status(403).json({ success: false, message: 'Account is inactive. Please contact admin.' });
        }

        console.log(`Password hash from database: ${employee.password_hash}`);
        console.log(`Password entered: ${password}`);

        if (!employee.password_hash) {
            console.log(`Response returned: Account not fully set up`);
            return res.status(401).json({ success: false, message: 'Account not fully set up. Please contact admin.' });
        }

        const isMatch = await bcrypt.compare(password, employee.password_hash);
        console.log(`bcrypt.compare() result: ${isMatch}`);

        if (!isMatch) {
            console.log(`Response returned: Invalid credentials (wrong password)`);
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const permissions = typeof employee.permissions === 'string' ? JSON.parse(employee.permissions) : (employee.permissions || []);
        if (employee.first_login) {
            const tempToken = jwt.sign(
                { id: employee.employee_id, email: employee.email, isTemp: true },
                JWT_SECRET,
                { expiresIn: '15m' }
            );
            return res.status(200).json({
                success: true,
                requirePasswordChange: true,
                token: tempToken,
                message: 'First login detected. Please change your password.'
            });
        }

        const token = jwt.sign(
            {
                id: employee.employee_id,
                role_id: employee.role_id,
                role_name: employee.role_name,
                permissions: permissions,
                email: employee.email
            },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 12 * 60 * 60 * 1000 // 12 hours
        });

        res.status(200).json({
            success: true,
            requirePasswordChange: false,
            user: {
                id: employee.employee_id,
                full_name: employee.full_name,
                email: employee.email,
                role_name: employee.role_name,
                permissions: permissions
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};


// ===============================
// Change First Password
// ===============================
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // We use req.user injected by verifyToken (which in this case is the tempToken)
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Invalid session.' });
        }

        const query = `
            SELECT
                e.employee_id,
                e.full_name,
                e.email,
                e.status,
                e.role_id,
                r.role_name,
                r.permissions,
                a.password_hash,
                a.first_login,
                a.password_changed
            FROM employees e
            LEFT JOIN employee_auth_accounts a ON e.employee_id = a.employee_id
            LEFT JOIN roles r ON e.role_id = r.role_id
            WHERE e.employee_id = $1
        `;
        const result = await pool.query(query, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!req.user.isTemp) {
            return res.status(403).json({ success: false, message: 'Password change is only allowed for first login sessions.' });
        }

        const employee = result.rows[0];

        if (!employee.password_hash) {
            return res.status(400).json({ success: false, message: 'Account not fully set up. Please contact admin.' });
        }

        // Validate current password
        const isMatch = await bcrypt.compare(currentPassword, employee.password_hash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect current password.' });
        }

        // Validate new password complexity (basic check, UI should enforce strongly)
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        const client = await pool.connect();
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        try {
            await client.query('BEGIN');

            await client.query(
                `
                UPDATE employee_auth_accounts
                SET
                    password_hash = $1,
                    first_login = FALSE,
                    password_changed = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE employee_id = $2
                `,
                [newPasswordHash, employee.employee_id]
            );

            await client.query(
                'UPDATE employees SET password_hash = $1, is_first_login = FALSE WHERE employee_id = $2',
                [newPasswordHash, employee.employee_id]
            );

            await client.query('COMMIT');
        } catch (transactionError) {
            await client.query('ROLLBACK');
            throw transactionError;
        } finally {
            client.release();
        }

        const permissions = typeof employee.permissions === 'string' ? JSON.parse(employee.permissions) : (employee.permissions || []);

        // Issue new full token
        const token = jwt.sign(
            {
                id: employee.employee_id,
                role_id: employee.role_id,
                role_name: employee.role_name,
                permissions: permissions,
                email: employee.email
            },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 12 * 60 * 60 * 1000 // 12 hours
        });

        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
            user: {
                id: employee.employee_id,
                full_name: employee.full_name,
                email: employee.email,
                role_name: employee.role_name,
                permissions: permissions
            }
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: 'Server error during password change' });
    }
};

// ===============================
// Self Register Employee
// ===============================
exports.register = async (req, res) => {
    try {
        const { full_name, email, phone, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide full name, email, and password.' });
        }

        // Check if email already exists
        const checkEmail = await pool.query('SELECT employee_id FROM employees WHERE email = $1', [email]);
        if (checkEmail.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email is already registered.' });
        }

        // Find the 'Employee' role ID
        const roleQuery = await pool.query("SELECT role_id FROM roles WHERE role_name = 'Employee' LIMIT 1");
        let employeeRoleId = roleQuery.rows[0]?.role_id;

        // If no explicit Employee role exists, just fallback to whatever the lowest role is, or null
        if (!employeeRoleId) {
            const fallbackRole = await pool.query("SELECT role_id FROM roles ORDER BY role_id DESC LIMIT 1");
            employeeRoleId = fallbackRole.rows[0]?.role_id || null;
        }

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO employees 
                (full_name, email, phone, role_id, status)
                VALUES ($1, $2, $3, $4, 'Active')
                RETURNING employee_id;
            `;

            const employeeResult = await client.query(query, [full_name, email, phone || null, employeeRoleId]);
            const employee = employeeResult.rows[0];

            const passwordResult = await setEmployeeTemporaryPassword(client, {
                employeeId: employee.employee_id,
                email,
                temporaryPassword: password,
                firstLogin: false,
                passwordChanged: true
            });

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Registration successful. You can now log in.',
                temporaryPassword: passwordResult.temporaryPassword
            });
        } catch (transactionError) {
            await client.query('ROLLBACK');
            throw transactionError;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

// ===============================
// Logout
// ===============================
exports.logout = (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// ===============================
// Get Current User (Auth)
// ===============================
exports.getMe = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const employeeId = decoded.id;

        // Fetch user details from database
        const result = await pool.query(`
            SELECT 
                e.employee_id, e.full_name, e.email, e.status, e.role_id,
                r.role_name, r.permissions
            FROM employees e
            LEFT JOIN roles r ON e.role_id = r.role_id
            WHERE e.employee_id = $1
        `, [employeeId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const employee = result.rows[0];
        if (employee.status !== 'Active') {
            return res.status(403).json({ success: false, message: 'Account is inactive' });
        }

        let permissions = [];
        if (employee.role_name === 'Admin') {
            permissions = [];
        } else {
            try {
                permissions = employee.permissions ? JSON.parse(employee.permissions) : [];
            } catch (e) {
                permissions = employee.permissions || [];
            }
        }

        res.status(200).json({
            success: true,
            user: {
                id: employee.employee_id,
                full_name: employee.full_name,
                email: employee.email,
                role_name: employee.role_name,
                permissions: permissions
            }
        });

    } catch (error) {
        console.error('Auth check error:', error);
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};