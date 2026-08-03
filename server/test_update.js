const pool = require('./config/db');

async function updateDB() {
    try {
        await pool.query(`UPDATE roles SET permissions = '["View Employees"]'::jsonb WHERE role_name = 'Team Lead'`);
        console.log("DB Updated successfully.");
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}

updateDB();
