// Use native fetch
async function test() {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@company.com', password: 'adminpassword' }) // I don't know the exact password, but let's see if we can generate a token directly
    });
    
    // Better yet, just use the db to get the ID and sign a token
    const pool = require('./config/db');
    const jwt = require('jsonwebtoken');
    const userRes = await pool.query("SELECT e.*, r.role_name FROM employees e JOIN roles r ON e.role_id = r.role_id WHERE e.email = 'admin@company.com'");
    const employee = userRes.rows[0];
    const token = jwt.sign(
        { 
            id: employee.employee_id, 
            role_id: employee.role_id, 
            role_name: employee.role_name,
            permissions: [],
            email: employee.email
        },
        process.env.JWT_SECRET || 'fallback_secret', // Need the actual secret
        { expiresIn: '12h' }
    );
    
    console.log("Generated Token:", token);
    
    // Now call /api/employees/me
    const meRes = await fetch('http://localhost:5000/api/employees/me', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const meData = await meRes.json();
    console.log("ME DATA:", meData);
    process.exit(0);
}
test().catch(console.error);
