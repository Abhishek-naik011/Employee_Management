const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ host: 'localhost', port: 5433, user: 'postgres', password: 'tiger', database: 'employee_management' });
(async () => {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        const res = await pool.query('SELECT employee_id FROM employees WHERE email = $1', ['admin@company.com']);
        const empId = res.rows[0].employee_id;
        await pool.query('UPDATE employee_auth_accounts SET password_hash = $1 WHERE employee_id = $2', [hash, empId]);
        await pool.query('UPDATE employees SET password_hash = $1 WHERE employee_id = $2', [hash, empId]);
        console.log('Password updated successfully');
        process.exit(0);
    } catch(e) { console.error(e); process.exit(1); }
})();
