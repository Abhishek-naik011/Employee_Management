const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_regularizations (
          regularization_id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES employees(employee_id),
          attendance_date DATE NOT NULL,
          issue_type VARCHAR(50) NOT NULL,
          reason TEXT,
          current_check_in TIME,
          current_check_out TIME,
          requested_check_in TIME,
          requested_check_out TIME,
          status VARCHAR(20) DEFAULT 'Pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table attendance_regularizations created successfully');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    pool.end();
  }
};

createTable();
