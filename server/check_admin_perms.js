const pool = require('./config/db');
(async () => {
    const res = await pool.query("SELECT e.email, r.permissions FROM employees e LEFT JOIN roles r ON e.role_id = r.role_id WHERE e.email = 'admin@company.com'");
    console.log(res.rows[0]);
    process.exit(0);
})();
