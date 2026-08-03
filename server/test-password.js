const pool = require('./server/config/db');
const bcrypt = require('bcrypt');

async function test() {
    const client = await pool.connect();
    try {
        const userId = 1;
        const newPasswordHash = await bcrypt.hash('Admin@12345', 10);
        console.log('Hash:', newPasswordHash);

        await client.query('BEGIN');
        
        const res1 = await client.query(
            'UPDATE employees SET password_hash = $1 WHERE employee_id = $2 RETURNING *',
            [newPasswordHash, userId]
        );
        console.log('Employees update:', res1.rowCount);
        
        const res2 = await client.query(
            'UPDATE employee_auth_accounts SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2 RETURNING *',
            [newPasswordHash, userId]
        );
        console.log('Auth accounts update:', res2.rowCount);
        
        await client.query('COMMIT');
        console.log('Committed');
    } catch (e) {
        console.error(e);
        await client.query('ROLLBACK');
    } finally {
        client.release();
    }
}
test().then(() => process.exit(0));
