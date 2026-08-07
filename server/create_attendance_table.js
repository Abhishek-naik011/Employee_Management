const pool = require('./config/db.js');

const query = `
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(employee_id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMP NOT NULL,
    check_out_time TIMESTAMP,
    working_minutes INT DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_daily_attendance UNIQUE (employee_id, attendance_date)
);
`;

pool.query(query)
  .then(res => { console.log('Table created successfully'); pool.end(); })
  .catch(err => { console.error('Error creating table:', err); pool.end(); });
