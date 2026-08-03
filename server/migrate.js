const pool = require('./config/db');
const {
    ensureEmployeeAuthTable,
    backfillMissingEmployeeAuthAccounts
} = require('./utils/authAccounts');

async function runMigrations() {
    try {
        await ensureEmployeeAuthTable(pool);
        await backfillMissingEmployeeAuthAccounts(pool);
        console.log('✅ employee_auth_accounts table ensured and backfilled.');

        // Add salary column to employees if it doesn't exist
        await pool.query(`
            ALTER TABLE employees
            ADD COLUMN IF NOT EXISTS salary NUMERIC(12,2) DEFAULT 0;
        `);
        console.log('✅ salary column ensured on employees table.');

        // Ensure assignments table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS assignments (
                assignment_id SERIAL PRIMARY KEY,
                employee_id   INTEGER REFERENCES employees(employee_id) ON DELETE CASCADE,
                project_id    INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
                role          VARCHAR(255),
                assigned_date DATE,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ assignments table ensured.');

        // Seed roles if table is empty
        const rolesCount = await pool.query('SELECT COUNT(*) FROM roles;');
        if (parseInt(rolesCount.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO roles (role_name, description) VALUES
                ('Admin', 'Full system access with all permissions.'),
                ('HR Manager', 'Manage employees, departments and view reports.'),
                ('Project Manager', 'Full access to projects and team assignment.'),
                ('Team Lead', 'Oversees team, views projects and employee list.'),
                ('Employee', 'Basic access to personal profile and assigned project.')
                ON CONFLICT DO NOTHING;
            `);
            console.log('✅ Seeded 5 roles.');
        } else {
            console.log(`ℹ️  Roles already has ${rolesCount.rows[0].count} record(s) — skipping seed.`);
        }

        // Seed departments if table is empty
        const deptCount = await pool.query('SELECT COUNT(*) FROM departments;');
        if (parseInt(deptCount.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO departments (department_name, department_code, department_head, description) VALUES
                ('Software Development', 'SD-01', 'Rahul Sharma', 'Handles all software products.'),
                ('Human Resources', 'HR-01', 'Priya Singh', 'Manages hiring and employee welfare.'),
                ('Marketing', 'MKT-01', 'Amit Patel', 'Brand and campaign management.'),
                ('Sales', 'SLS-01', 'Neha Gupta', 'Client acquisition and revenue.')
                ON CONFLICT DO NOTHING;
            `);
            console.log('✅ Seeded 4 departments.');
        } else {
            console.log(`ℹ️  Departments already has ${deptCount.rows[0].count} record(s) — skipping seed.`);
        }

        // Seed projects if table is empty
        const projCount = await pool.query('SELECT COUNT(*) FROM projects;');
        if (parseInt(projCount.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO projects (project_name, project_code, client_name, start_date, end_date, status) VALUES
                ('Employee Portal',  'PRJ-EP',  'Internal',   '2025-01-10', '2025-12-31', 'Active'),
                ('Cloud Migration',  'PRJ-CM',  'TechCorp',   '2025-03-01', '2026-06-30', 'Active'),
                ('Q3 Marketing',     'PRJ-MKT', 'RetailInc',  '2025-07-01', '2025-09-30', 'Completed'),
                ('Sales Dashboard',  'PRJ-SD',  'Internal',   '2025-08-15', '2025-11-30', 'On Hold')
                ON CONFLICT DO NOTHING;
            `);
            console.log('✅ Seeded 4 projects.');
        } else {
            console.log(`ℹ️  Projects already has ${projCount.rows[0].count} record(s) — skipping seed.`);
        }

        // Seed employees if table is empty
        const empCount = await pool.query('SELECT COUNT(*) FROM employees;');
        if (parseInt(empCount.rows[0].count) === 0) {
            // Get dept and role IDs
            const depts = await pool.query('SELECT department_id, department_name FROM departments ORDER BY department_id;');
            const roles = await pool.query('SELECT role_id, role_name FROM roles ORDER BY role_id;');

            const deptMap = {};
            depts.rows.forEach(d => { deptMap[d.department_name] = d.department_id; });
            const roleMap = {};
            roles.rows.forEach(r => { roleMap[r.role_name] = r.role_id; });

            const deptNames = ['Software Development', 'Human Resources', 'Marketing', 'Sales'];
            const roleNames = ['Admin', 'HR Manager', 'Project Manager', 'Team Lead', 'Employee'];
            const designations = ['Frontend Developer', 'HR Manager', 'Backend Developer', 'Marketing Specialist', 'Sales Lead', 'UI/UX Designer'];
            const names = ['Rahul Sharma', 'Priya Singh', 'Amit Patel', 'Neha Gupta', 'Vikram Singh',
                           'Ananya Desai', 'Rohan Mehta', 'Sneha Kapoor', 'Karan Verma', 'Pooja Joshi'];

            for (let i = 0; i < 25; i++) {
                const nameBase = names[i % 10];
                const fullName = i > 9 ? `${nameBase} ${i}` : nameBase;
                const email = `user${i + 1}@company.com`;
                const phone = `+91 9876543${String(i).padStart(3, '0')}`;
                const deptName = deptNames[i % 4];
                const roleName = roleNames[i % 5];
                const designation = designations[i % 6];
                const status = (i % 7 === 0) ? 'Inactive' : 'Active';
                const month = String((i % 12) + 1).padStart(2, '0');
                const day   = String((i % 28) + 1).padStart(2, '0');
                const joiningDate = `2023-${month}-${day}`;
                const salary = 50000 + (i * 2500);

                await pool.query(`
                    INSERT INTO employees (full_name, email, phone, designation, department_id, role_id, joining_date, status, salary)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (email) DO NOTHING;
                `, [
                    fullName,
                    email,
                    phone,
                    designation,
                    deptMap[deptName] || null,
                    roleMap[roleName] || null,
                    joiningDate,
                    status,
                    salary
                ]);
            }
            console.log('✅ Seeded 25 employees.');
        } else {
            console.log(`ℹ️  Employees already has ${empCount.rows[0].count} record(s) — skipping seed.`);
        }

        console.log('\n🎉 Migration complete. All tables are ready.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    }
}

if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = {
    runMigrations
};
