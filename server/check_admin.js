const pool = require('./config/db');
(async () => {
    const res = await pool.query("SELECT e.employee_id, a.password_hash as auth_hash, e.password_hash as emp_hash FROM employees e LEFT JOIN employee_auth_accounts a ON e.employee_id = a.employee_id WHERE e.email = 'admin@company.com'");
    console.log(res.rows[0]);
    process.exit(0);
})();
