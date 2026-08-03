const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'tiger',
  database: 'employee_management'
});
async function run() {
  const res = await pool.query('SELECT role_id, role_name, permissions FROM roles');
  let updated = 0;
  for (let r of res.rows) {
    if (r.permissions) {
      let perms = null;
      try {
        perms = Array.isArray(r.permissions) ? r.permissions : JSON.parse(r.permissions);
      } catch(e) {}
      
      if (perms && perms.includes('Manage Employees')) {
        const newPerms = perms.filter(p => p !== 'Manage Employees');
        await pool.query('UPDATE roles SET permissions = $1 WHERE role_id = $2', [JSON.stringify(newPerms), r.role_id]);
        updated++;
      }
    }
  }
  console.log('Removed from ' + updated + ' roles.');
  pool.end();
}
run().catch(err => { console.error(err); pool.end(); });
