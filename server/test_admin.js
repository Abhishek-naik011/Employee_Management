const pool = require('./config/db');

async function testAdmin() {
    const res = await pool.query("SELECT e.*, r.role_name FROM employees e JOIN roles r ON e.role_id = r.role_id WHERE e.email = 'admin@company.com'");
    console.log(res.rows[0]);
    process.exit(0);
}
testAdmin();
