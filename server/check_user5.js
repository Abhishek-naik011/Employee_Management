const pool = require('./config/db');
(async () => {
    const res = await pool.query("SELECT employee_id, password_hash, created_at, updated_at FROM employee_auth_accounts WHERE email = 'user5@company.com'");
    console.log(res.rows[0]);
    process.exit(0);
})();
