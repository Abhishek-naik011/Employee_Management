const pool = require('./config/db');
(async () => {
    try {
        const emp = await pool.query("SELECT employee_id, email FROM employees WHERE email='admin@company.com'");
        console.log('Employee Row:', emp.rows[0]);
        if (emp.rows.length > 0) {
            const adminId = emp.rows[0].employee_id;
            const auth = await pool.query("SELECT employee_id, password_hash, first_login, password_changed FROM employee_auth_accounts WHERE employee_id=$1", [adminId]);
            console.log('Auth Row:', auth.rows[0]);
            
            const bcrypt = require('bcrypt');
            const isMatch = await bcrypt.compare('admin1234', auth.rows[0].password_hash);
            console.log('bcrypt.compare("admin1234", hash) =', isMatch);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
