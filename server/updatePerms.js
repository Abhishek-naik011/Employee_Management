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
      
      if (perms && perms.includes('View Dashboard')) {
        const newPerms = perms.map(p => p === 'View Dashboard' ? 'Manage Employees' : p);
        
        // Use standard update, since we don't know the exact column type, we'll try JSON string first
        try {
            await pool.query('UPDATE roles SET permissions = $1 WHERE role_id = $2', [JSON.stringify(newPerms), r.role_id]);
        } catch (err) {
            console.log("Failed with string, trying cast to jsonb");
            await pool.query('UPDATE roles SET permissions = $1::jsonb WHERE role_id = $2', [JSON.stringify(newPerms), r.role_id]);
        }
        updated++;
      }
    }
  }
  
  console.log('Updated ' + updated + ' roles.');
  
  const res2 = await pool.query('SELECT role_id, role_name, permissions FROM roles');
  res2.rows.forEach(r => console.log(r.role_name, r.permissions));
  
  pool.end();
}
run().catch(err => { console.error(err); pool.end(); });
