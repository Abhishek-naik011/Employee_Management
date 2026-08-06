const pool = require('./config/db');
(async () => {
    try {
        const emp = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'employees'");
        const dept = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'departments'");
        const proj = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'projects'");
        console.log('Employees:', emp.rows.map(r=>r.column_name).join(', '));
        console.log('Departments:', dept.rows.map(r=>r.column_name).join(', '));
        console.log('Projects:', proj.rows.map(r=>r.column_name).join(', '));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
