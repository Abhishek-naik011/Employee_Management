const pool = require('./config/db.js');

const query = `
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS previous_working_minutes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS resume_start_time TIMESTAMP;
`;

pool.query(query)
  .then(res => { console.log('Table altered successfully'); pool.end(); })
  .catch(err => { console.error('Error altering table:', err); pool.end(); });
