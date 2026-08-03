const pool = require('./config/db');

async function createAssignments() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                assignment_id SERIAL PRIMARY KEY,
                employee_id INTEGER REFERENCES employees(employee_id) ON DELETE CASCADE,
                project_id INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
                role VARCHAR(255),
                assigned_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Assignments table created.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

createAssignments();
