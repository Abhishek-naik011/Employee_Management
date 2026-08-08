const pool = require('./server/config/db');
pool.query("SELECT * FROM attendance WHERE attendance_date = CURRENT_DATE AND status = 'Working'").then(res => {
    console.log("Working records:", res.rows);
    process.exit(0);
});
