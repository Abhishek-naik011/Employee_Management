const pool = require('./config/db');
const bcrypt = require('bcrypt');

(async () => {
    const email = 'user5@company.com';
    const password = 'password123';
    
    console.log('--- LOGIN DEBUG ---');
    console.log('Email received:', email);
    
    const query = `
        SELECT
            e.employee_id,
            a.password_hash
        FROM employees e
        LEFT JOIN employee_auth_accounts a ON e.employee_id = a.employee_id
        WHERE e.email = $1
    `;
    const result = await pool.query(query, [email]);
    console.log('User found in database:', result.rows.length > 0);
    
    if (result.rows.length > 0) {
        const employee = result.rows[0];
        console.log('Password hash from database:', employee.password_hash);
        console.log('Password entered:', password);
        
        if (employee.password_hash) {
            const isMatch = await bcrypt.compare(password, employee.password_hash);
            console.log('bcrypt.compare() result:', isMatch);
        }
    }
    process.exit(0);
})();
