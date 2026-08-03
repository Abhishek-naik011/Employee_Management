const pool = require('./config/db');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res2 = await client.query("UPDATE employee_auth_accounts SET password_hash='NEW_HASH_2' WHERE employee_id=1 RETURNING password_hash");
    console.log("UPDATED HASH:", res2.rows[0]?.password_hash);
    await client.query('COMMIT');
  } catch (e) {
    console.error(e);
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
}
run().then(() => process.exit(0)).catch(e => console.error(e));
