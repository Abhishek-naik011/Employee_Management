const pool = require('./config/db');
(async () => {
    const res = await pool.query("SELECT employee_id, email, password_hash FROM employees WHERE email = 'admin@company.com'");
    console.log(res.rows);
    process.exit(0);
})();
