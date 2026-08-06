const pool = require('./config/db');
const bcrypt = require('bcrypt');

(async () => {
    try {
        const emp = await pool.query("SELECT employee_id FROM employees WHERE email='admin@company.com'");
        if (emp.rows.length > 0) {
            const adminId = emp.rows[0].employee_id;
            const hash = await bcrypt.hash("admin1234", 10);
            
            await pool.query("UPDATE employee_auth_accounts SET password_hash=$1 WHERE employee_id=$2", [hash, adminId]);
            console.log("Updated password hash for admin user to admin1234.");
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
