const pool = require('./config/db');

async function run() {
  const res1 = await pool.query("SELECT password_hash FROM employee_auth_accounts WHERE employee_id=1");
  console.log("OLD HASH:", res1.rows[0].password_hash);
  
  const res2 = await pool.query("UPDATE employee_auth_accounts SET password_hash='NEW_HASH' WHERE employee_id=1 RETURNING password_hash");
  console.log("UPDATED HASH:", res2.rows[0]?.password_hash);
  
  const res3 = await pool.query("SELECT password_hash FROM employee_auth_accounts WHERE employee_id=1");
  console.log("FETCHED HASH:", res3.rows[0].password_hash);
}
run().then(() => process.exit(0)).catch(e => console.error(e));
