const pool = require('./config/db');
(async () => {
    const res = await pool.query("SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'employees'");
    console.log(res.rows);
    process.exit(0);
})();
