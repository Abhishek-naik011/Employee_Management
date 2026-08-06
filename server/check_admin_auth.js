const pool = require('./config/db');
(async () => {
    const res = await pool.query("SELECT * FROM employee_auth_accounts WHERE email = 'admin@company.com'");
    console.log(res.rows[0]);
    process.exit(0);
})();
