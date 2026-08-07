const pool = require('../config/db');

// Helper functions for ID resolution
const getEmployeeIdByName = async (client, nameOrId) => {
    if (!nameOrId) return null;
    
    const input = String(nameOrId).trim();

    if (input.includes('@')) {
        const res = await client.query("SELECT employee_id FROM employees WHERE LOWER(email) = LOWER($1)", [input]);
        return res.rows.length ? res.rows[0].employee_id : null;
    }

    const res = await client.query(
        "SELECT employee_id, full_name, email FROM employees WHERE LOWER(full_name) LIKE LOWER($1)",
        [`%${input}%`]
    );

    if (res.rows.length === 1) return res.rows[0].employee_id;
    if (res.rows.length > 1) {
        const matches = res.rows.map(r => `- ${r.full_name} (${r.email})`).join('\\n');
        throw new Error(`Multiple employees found matching '${input}':\n${matches}\nPlease specify the exact email address.`);
    }

    return null;
};

const getDepartmentIdByName = async (client, nameOrId) => {
    if (!nameOrId) return null;
    if (!isNaN(parseInt(nameOrId, 10)) && Number.isInteger(Number(nameOrId))) return parseInt(nameOrId, 10);

    const res = await client.query(
        "SELECT department_id FROM departments WHERE LOWER(department_name) LIKE LOWER($1) OR LOWER(department_code) = LOWER($2) LIMIT 1",
        [`%${nameOrId}%`, nameOrId]
    );
    return res.rows.length ? res.rows[0].department_id : null;
};

const getRoleIdByName = async (client, nameOrId) => {
    if (!nameOrId) return null;
    if (!isNaN(parseInt(nameOrId, 10)) && Number.isInteger(Number(nameOrId))) return parseInt(nameOrId, 10);

    const res = await client.query(
        "SELECT role_id FROM roles WHERE LOWER(role_name) LIKE LOWER($1) LIMIT 1",
        [`%${nameOrId}%`]
    );
    return res.rows.length ? res.rows[0].role_id : null;
};

const getProjectIdByName = async (client, nameOrId) => {
    if (!nameOrId) return null;
    if (!isNaN(parseInt(nameOrId, 10)) && Number.isInteger(Number(nameOrId))) return parseInt(nameOrId, 10);

    const res = await client.query(
        "SELECT project_id FROM projects WHERE LOWER(project_name) LIKE LOWER($1) OR LOWER(project_code) = LOWER($2) LIMIT 1",
        [`%${nameOrId}%`, nameOrId]
    );
    return res.rows.length ? res.rows[0].project_id : null;
};

exports.executeAction = async (req, res) => {
    const { intent, parameters } = req.body;
    const client = await pool.connect();
    let customMessage = null;

    try {
        await client.query('BEGIN');

        // Resolve Foreign Keys
        let empId = parameters.employee_id || parameters.employee_name || parameters.full_name || parameters.name || parameters.id || null;
        let deptId =
            parameters.department_id ||
            parameters.department ||
            parameters.department_name ||
            parameters.current_department_name ||
            parameters.new_department ||
            parameters.id ||
            null;
        let roleId = parameters.role_id || parameters.role || parameters.role_name || parameters.current_role_name || parameters.new_role || parameters.id || null;
        let projId = parameters.project_id || parameters.project || parameters.project_name || parameters.target_name || parameters.id || null;
        let mgrId = parameters.manager_id || parameters.manager || parameters.manager_name || parameters.project_lead || parameters.department_head || parameters.new_head || null;

        console.log("PARAMETERS RECEIVED:");
        console.log(parameters);

        console.log(JSON.stringify(parameters, null, 2));

        console.log("EMPLOYEE LOOKUP VALUE:");
        console.log(empId);

        const resolvedEmployeeId = await getEmployeeIdByName(client, empId);
        let resolvedDepartmentId = await getDepartmentIdByName(client, deptId);
        const resolvedRoleId = await getRoleIdByName(client, roleId);

        let resolvedProjectId = null;
        if (projId) {
            resolvedProjectId = await getProjectIdByName(
                client,
                projId
            );
        }

        const resolvedManagerId = await getEmployeeIdByName(client, mgrId);

        console.log(`\n=========================================`);
        console.log(`Detected Intent: ${intent}`);
        console.log(`Resolved employee_id: ${resolvedEmployeeId}`);
        console.log(`Resolved department_id: ${resolvedDepartmentId}`);
        console.log(`Resolved role_id: ${resolvedRoleId}`);
        console.log(`Resolved project_id: ${resolvedProjectId}`);

        let resultData = null;
        let moduleName = 'unknown';
        let operationType = 'unknown';
        let undoData = null;

        // Intent Execution Mapping
        if (intent === 'CREATE_EMPLOYEE') {
            // FIX: If the LLM mistakenly outputs CREATE_EMPLOYEE but the employee already exists, convert to UPDATE
            if (resolvedEmployeeId) {
                console.log(`Employee already exists! Intercepting CREATE_EMPLOYEE and converting to UPDATE_EMPLOYEE.`);
                operationType = 'UPDATE';
                moduleName = 'employees';

                const query = `UPDATE employees SET department_id = COALESCE($1, department_id), role_id = COALESCE($2, role_id) WHERE employee_id = $3 RETURNING *`;
                console.log(`Chosen CRUD: UPDATE employees`);
                console.log(`SQL Operation: ${query}`);

                const result = await client.query(query, [resolvedDepartmentId, resolvedRoleId, resolvedEmployeeId]);
                resultData = result.rows[0];
            } else {
                operationType = 'CREATE';
                moduleName = 'employees';
                const query = `
                    INSERT INTO employees (full_name, email, phone, department_id, role_id, salary, status) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
                `;
                console.log(`Chosen CRUD: INSERT employees`);
                console.log(`SQL Operation: ${query}`);

                // Note: password generation/syncing would normally happen here, but for chatbot we stick to basic fields
                const result = await client.query(query, [
                    parameters.full_name || parameters.name || 'New Employee',
                    parameters.email || `temp_${Date.now()}@test.com`,
                    parameters.phone || null,
                    resolvedDepartmentId || null,
                    resolvedRoleId || null,
                    parameters.salary || 0,
                    'Active'
                ]);
                resultData = result.rows[0];
            }
        }
        else if (intent === 'UPDATE_EMPLOYEE') {
            const oldStateRes = await client.query('SELECT * FROM employees WHERE employee_id = $1', [resolvedEmployeeId]);
            undoData = { previousState: oldStateRes.rows[0] };

            if (!resolvedEmployeeId) throw new Error("Could not find the specified employee.");

            operationType = 'UPDATE';
            moduleName = 'employees';

            // Build dynamic update query
            let updates = [];
            let values = [];

            const updateData = parameters.fields_to_update || parameters;

            if (updateData.full_name !== undefined || updateData.name !== undefined) {
                updates.push(`full_name = $${values.length + 1}`);
                values.push(updateData.full_name || updateData.name);
            }

            if ((updateData.email !== undefined || updateData.new_email !== undefined) && updateData.new_email !== 'skip') {
                updates.push(`email = $${values.length + 1}`);
                values.push(updateData.email || updateData.new_email);
            }

            if ((updateData.phone !== undefined || updateData.new_phone !== undefined) && updateData.new_phone !== 'skip') {
                updates.push(`phone = $${values.length + 1}`);
                values.push(updateData.phone || updateData.new_phone);
            }

            const salary = updateData.salary ?? updateData.new_salary;

            if (salary !== undefined && salary !== null && salary !== 'skip') {
                updates.push(`salary = $${values.length + 1}`);
                values.push(Number(salary));
            }
            
            if (updateData.new_status !== undefined && updateData.new_status !== 'skip') {
                updates.push(`status = $${values.length + 1}`);
                values.push(updateData.new_status);
            }

            if (resolvedDepartmentId !== null) {
                updates.push(`department_id = $${values.length + 1}`);
                values.push(resolvedDepartmentId);
            }
            if (resolvedRoleId !== null) {
                updates.push(`role_id = $${values.length + 1}`);
                values.push(resolvedRoleId);
            }

            console.log("UPDATES:", updates);
            console.log("VALUES:", values);

            if (updates.length === 0) {
                throw new Error("No fields supplied for update.");
            }

            // Append employee_id for WHERE clause
            values.push(resolvedEmployeeId);

            const sql = `
                UPDATE employees
                SET ${updates.join(', ')}
                WHERE employee_id = $${values.length}
                RETURNING *;
            `;

            console.log('Generated UPDATE SQL:', sql);
            console.log('Values:', values);

            const result = await client.query(sql, values);

            console.log("Rows Updated:", result.rowCount);
            console.log("Updated Record:", result.rows);

            resultData = result.rows[0];
            }
        else if (intent === 'DELETE_EMPLOYEE') {
            
            let employeeIdToDelete = parameters.confirmed && parameters.id ? parameters.id : resolvedEmployeeId;

            if (!employeeIdToDelete) {
                throw new Error("Could not find the specified employee.");
            }

            operationType = 'DELETE';
            moduleName = 'employees';

            if (!parameters.confirmed) {
                // Impact Analysis
                const projRes = await client.query('SELECT projects.project_name FROM assignments JOIN projects ON assignments.project_id = projects.project_id WHERE assignments.employee_id = $1', [employeeIdToDelete]);
                const empRes = await client.query('SELECT employees.full_name, departments.department_name, roles.role_name FROM employees LEFT JOIN departments ON employees.department_id = departments.department_id LEFT JOIN roles ON employees.role_id = roles.role_id WHERE employees.employee_id = $1', [employeeIdToDelete]);
                const empInfo = empRes.rows[0];
                
                let analysis = `Impact Analysis for Employee '${empInfo.full_name}':\n`;
                analysis += `- Department: ${empInfo.department_name || 'None'}\n`;
                analysis += `- Role: ${empInfo.role_name || 'None'}\n`;
                if (projRes.rows.length > 0) {
                    analysis += `- Assigned Projects: ${projRes.rows.length}\n  ( ${projRes.rows.map(r => r.project_name).join(', ')} )\n`;
                } else {
                    analysis += `- Assigned Projects: 0\n`;
                }
                
                return res.json({
                    success: true,
                    require_confirmation: true,
                    impact_analysis: analysis,
                    intent: 'DELETE_EMPLOYEE',
                    module: 'employees',
                    entityId: employeeIdToDelete
                });
            }

            console.log("Executing DELETE...");

            const result = await client.query(
                "DELETE FROM employees WHERE employee_id = $1 RETURNING *",
                [employeeIdToDelete]
            );

            console.log("Rows deleted:", result.rowCount);
            console.log("Deleted Record:", result.rows);

            if (result.rowCount === 0) {
                throw new Error("Employee was not deleted.");
            }

            resultData = result.rows[0];
            }
        else if (intent === 'CREATE_DEPARTMENT') {
            operationType = 'CREATE';
            moduleName = 'departments';

            const resolvedManagerId = await getEmployeeIdByName(
                client,
                parameters.department_head
            );

            console.log("========== CREATE DEPARTMENT ==========");
            console.log("PARAMETERS:", parameters);
            console.log("MANAGER ID:", resolvedManagerId);
            console.log("=======================================");

            const query = `
                INSERT INTO departments
                (department_name, department_code, department_head, description)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;

            const values = [
                parameters.department_name,
                parameters.department_code || `DEPT-${Date.now()}`,
                resolvedManagerId || null,
                parameters.description || ''
            ];

            const result = await client.query(query, values);
            resultData = result.rows[0];
        }
        else if (intent === 'UPDATE_DEPARTMENT') {
            const targetDeptName = parameters.name || parameters.department_name;
            console.log("Department name received from chatbot:", targetDeptName);

            const checkRes = await client.query(
                "SELECT * FROM departments WHERE LOWER(TRIM(department_name)) = LOWER(TRIM($1))",
                [targetDeptName]
            );

            if (checkRes.rows.length === 0) {
                throw new Error(`Department '${targetDeptName}' was not found.`);
            }

            const targetDepartment = checkRes.rows[0];
            resolvedDepartmentId = targetDepartment.department_id;
            undoData = { previousState: targetDepartment };

            operationType = 'UPDATE';
            moduleName = 'departments';
            const query = `
                UPDATE departments
                SET
                    department_name = COALESCE($1, department_name),
                    department_head = COALESCE($2, department_head),
                    description = COALESCE($3, description)
                WHERE department_id = $4
                RETURNING *`;

            console.log(`Chosen CRUD: UPDATE departments`);
            console.log(`SQL Operation: ${query}`);

            console.log("Resolved Department:", resolvedDepartmentId);
            console.log("Resolved Manager:", resolvedManagerId);
            console.log("New Department Name:", parameters.new_department_name);
            console.log("Description:", parameters.description);

            const result = await client.query(query, [
                parameters.new_department_name && parameters.new_department_name !== 'skip' ? parameters.new_department_name : null,
                resolvedManagerId || null,
                parameters.new_description && parameters.new_description !== 'skip' ? parameters.new_description : (parameters.description && parameters.description !== 'skip' ? parameters.description : null),
                resolvedDepartmentId
            ]);

            console.log("Rows Updated:", result.rowCount);
            console.log("Updated Record:", result.rows);

            resultData = result.rows[0];
            }
        else if (intent === 'DELETE_DEPARTMENT') {
            let departmentIdToDelete = parameters.confirmed && parameters.id ? parameters.id : resolvedDepartmentId;
            if (!departmentIdToDelete) throw new Error("Could not find the specified department.");

            operationType = 'DELETE';
            moduleName = 'departments';

            if (!parameters.confirmed) {
                const empRes = await client.query('SELECT full_name FROM employees WHERE department_id = $1', [departmentIdToDelete]);
                const projRes = await client.query('SELECT project_name FROM projects WHERE department_id = $1', [departmentIdToDelete]);
                
                // Get department name and head name (if available)
                const deptRes = await client.query(`
                    SELECT d.department_name, m.full_name AS head_name 
                    FROM departments d 
                    LEFT JOIN employees m ON CAST(m.employee_id AS VARCHAR) = d.department_head 
                    WHERE d.department_id = $1
                `, [departmentIdToDelete]);
                
                const deptData = deptRes.rows[0];
                
                let analysis = `Impact Analysis for Department '${deptData.department_name}':\n`;
                analysis += `- Department Head: ${deptData.head_name || 'Not Assigned'}\n`;
                
                if (empRes.rows.length > 0) {
                    analysis += `- Employees in department: ${empRes.rows.length}\n  ( ${empRes.rows.map(r => r.full_name).join(', ')} )\n`;
                } else {
                    analysis += `- Employees in department: 0\n`;
                }
                
                if (projRes.rows.length > 0) {
                    analysis += `- Active projects in department: ${projRes.rows.length}\n  ( ${projRes.rows.map(r => r.project_name).join(', ')} )\n`;
                } else {
                    analysis += `- Active projects in department: 0\n`;
                }
                
                return res.json({
                    success: true,
                    require_confirmation: true,
                    impact_analysis: analysis,
                    intent: 'DELETE_DEPARTMENT',
                    module: 'departments',
                    entityId: departmentIdToDelete
                });
            }
            console.log(`Chosen CRUD: DELETE FROM departments`);
            console.log(`SQL Operation: Set NULL for linked employees and projects, then DELETE`);

            await client.query(`UPDATE employees SET department_id = NULL WHERE department_id = $1`, [departmentIdToDelete]);
            await client.query(`UPDATE projects SET department_id = NULL WHERE department_id = $1`, [departmentIdToDelete]);

            const query = `DELETE FROM departments WHERE department_id = $1 RETURNING *`;
            const result = await client.query(query, [departmentIdToDelete]);
            resultData = result.rows[0];
            }
        else if (intent === 'CREATE_ROLE') {

            operationType = 'CREATE';
            moduleName = 'roles';

            const permissionsStr = parameters.permissions ? JSON.stringify(parameters.permissions) : '[]';

            const query = `
        INSERT INTO roles (role_name, description, permissions)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;

            const result = await client.query(query, [
                parameters.role_name,
                parameters.description || null,
                permissionsStr
            ]);

            resultData = result.rows[0];
            }
        else if (intent === 'UPDATE_ROLE') {
            const oldStateRes = await client.query('SELECT * FROM roles WHERE role_id = $1', [resolvedRoleId]);
            undoData = { previousState: oldStateRes.rows[0] };


            operationType = 'UPDATE';
            moduleName = 'roles';

            if (!resolvedRoleId) {
                throw new Error("Could not find the specified role.");
            }

            const roleId = resolvedRoleId;

            const roleRes = await client.query("SELECT permissions FROM roles WHERE role_id = $1", [roleId]);
            let newPermissions = roleRes.rows[0].permissions || [];

            if (parameters.permissions) {
                newPermissions = parameters.permissions;
            } else {
                if (parameters.permissions_to_add && Array.isArray(parameters.permissions_to_add)) {
                    parameters.permissions_to_add.forEach(p => {
                        if (!newPermissions.includes(p)) {
                            newPermissions.push(p);
                        }
                    });
                }
                if (parameters.permissions_to_remove && Array.isArray(parameters.permissions_to_remove)) {
                    newPermissions = newPermissions.filter(p => !parameters.permissions_to_remove.includes(p));
                }
            }

            let updateFields = [];
            let updateValues = [];
            let paramIndex = 1;

            if (parameters.new_role_name) {
                updateFields.push(`role_name = $${paramIndex++}`);
                updateValues.push(parameters.new_role_name);
            }

            if (parameters.permissions || parameters.permissions_to_add || parameters.permissions_to_remove) {
                updateFields.push(`permissions = $${paramIndex++}`);
                updateValues.push(JSON.stringify(newPermissions));
            }

            if (parameters.description !== undefined) {
                updateFields.push(`description = $${paramIndex++}`);
                updateValues.push(parameters.description);
            }

            if (updateFields.length === 0) {
                throw new Error("No fields provided to update.");
            }

            updateValues.push(roleId);
            const query = `
                UPDATE roles
                SET ${updateFields.join(', ')}
                WHERE role_id = $${paramIndex}
                RETURNING *;
            `;

            const result = await client.query(query, updateValues);
            resultData = result.rows[0];
            }
        else if (intent === 'DELETE_ROLE') {

            operationType = 'DELETE';
            moduleName = 'roles';

            let roleIdToDelete = parameters.confirmed && parameters.id ? parameters.id : resolvedRoleId;

            if (!roleIdToDelete) {
                throw new Error("Could not find the specified role.");
            }

            if (!parameters.confirmed) {
                const checkEmployeesQuery = `SELECT full_name FROM employees WHERE role_id = $1`;
                const checkEmployeesResult = await client.query(checkEmployeesQuery, [roleIdToDelete]);
                
                let analysis = `Impact Analysis for Role '${parameters.role_name || roleIdToDelete}':\n`;
                if (checkEmployeesResult.rows.length > 0) {
                    analysis += `- Assigned to ${checkEmployeesResult.rows.length} employee(s)\n  ( ${checkEmployeesResult.rows.map(r => r.full_name).join(', ')} )\n`;
                } else {
                    analysis += `- Assigned to: 0 employees\n`;
                }
                
                return res.json({
                    success: true,
                    require_confirmation: true,
                    impact_analysis: analysis,
                    intent: 'DELETE_ROLE',
                    module: 'roles',
                    entityId: roleIdToDelete
                });
            }

            const query = `
        DELETE FROM roles
        WHERE role_id = $1
        RETURNING *;
    `;

            const result = await client.query(query, [roleIdToDelete]);

            resultData = result.rows[0];
            }
        else if (intent === 'CREATE_PROJECT') {

            operationType = 'CREATE';
            moduleName = 'projects';

            const managerId = await getEmployeeIdByName(
                client,
                parameters.manager_name || parameters.project_lead || parameters.manager
            );

            const departmentId = await getDepartmentIdByName(
                client,
                parameters.department_name || parameters.department
            );

            console.log("========== CREATE PROJECT ==========");
            console.log("PARAMETERS:", parameters);
            console.log("PROJECT NAME:", parameters.project_name);
            console.log("PROJECT CODE:", parameters.project_code);
            console.log("DESCRIPTION:", parameters.description);
            console.log("MANAGER ID:", managerId);
            console.log("DEPARTMENT ID:", departmentId);
            console.log("STATUS:", parameters.status);
            console.log("START:", parameters.start_date);
            console.log("END:", parameters.end_date);
            console.log("====================================");



            const query = `
        INSERT INTO projects
(
    project_name,
    project_code,
    description,
    client_name,
    status,
    start_date,
    end_date
)
VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *;
    `;

            const values = [
                parameters.project_name,
                parameters.project_code || `PRJ-${Date.now()}`,
                parameters.description || '',
                parameters.client_name || 'Internal',
                parameters.status || 'Planning',
                parameters.start_date && parameters.start_date !== 'skip' ? parameters.start_date : null,
                parameters.end_date && parameters.end_date !== 'skip' ? parameters.end_date : null
            ];

            console.log("VALUES:", values);

            const result = await client.query(query, values);

            console.log("Rows:", result.rowCount);
            console.log("Inserted:", result.rows);

            resultData = result.rows[0];
            }
        else if (intent === 'UPDATE_PROJECT') {
            const oldStateRes = await client.query('SELECT * FROM projects WHERE project_id = $1', [resolvedProjectId]);
            undoData = { previousState: oldStateRes.rows[0] };


            operationType = 'UPDATE';
            moduleName = 'projects';

            if (!resolvedProjectId) {
                throw new Error("Could not find the specified project.");
            }
            
            const projectId = resolvedProjectId;

            const fields = [];
            const values = [];
            let index = 1;

            if (parameters.new_project_name && parameters.new_project_name !== 'skip') {
                fields.push(`project_name = $${index++}`);
                values.push(parameters.new_project_name);
            }
            if (parameters.new_client_name && parameters.new_client_name !== 'skip') {
                fields.push(`client_name = $${index++}`);
                values.push(parameters.new_client_name);
            }
            if (parameters.new_start_date && parameters.new_start_date !== 'skip') {
                fields.push(`start_date = $${index++}`);
                values.push(parameters.new_start_date);
            }
            if (parameters.new_end_date && parameters.new_end_date !== 'skip') {
                fields.push(`end_date = $${index++}`);
                values.push(parameters.new_end_date);
            }
            if (parameters.new_status && parameters.new_status !== 'skip') {
                fields.push(`status = $${index++}`);
                values.push(parameters.new_status);
            }

            if (fields.length === 0) {
                throw new Error("No fields supplied to update.");
            }

            values.push(projectId);

            const query = `
                UPDATE projects
                SET ${fields.join(', ')}
                WHERE project_id = $${index}
                RETURNING *;
            `;

            console.log(query);
            console.log(values);

            const result = await client.query(query, values);

            resultData = result.rows[0];
            }
        else if (intent === 'DELETE_PROJECT') {

            operationType = 'DELETE';
            moduleName = 'projects';

            let projectIdToDelete = parameters.confirmed && parameters.id ? parameters.id : resolvedProjectId;
            if (!projectIdToDelete) {
                projectIdToDelete = await getProjectIdByName(client, parameters.project_name);
            }

            if (!projectIdToDelete) {
                throw new Error("Could not find the specified project.");
            }

            if (!parameters.confirmed) {
                const empRes = await client.query('SELECT employees.full_name FROM assignments JOIN employees ON assignments.employee_id = employees.employee_id WHERE assignments.project_id = $1', [projectIdToDelete]);
                
                const projRes = await client.query(`
                    SELECT 
                        p.project_name, 
                        p.project_code, 
                        p.status, 
                        m.full_name AS manager_name,
                        d.department_name
                    FROM projects p
                    LEFT JOIN employees m ON p.manager_id = m.employee_id
                    LEFT JOIN departments d ON p.department_id = d.department_id
                    WHERE p.project_id = $1
                `, [projectIdToDelete]);
                
                const pData = projRes.rows[0];
                
                let analysis = `Impact Analysis for Project '${pData.project_name}':\n`;
                analysis += `- Project Code: ${pData.project_code || 'N/A'}\n`;
                analysis += `- Project Manager: ${pData.manager_name || 'Not Assigned'}\n`;
                analysis += `- Department: ${pData.department_name || 'Not Assigned'}\n`;
                analysis += `- Project Status: ${pData.status || 'N/A'}\n`;
                
                if (empRes.rows.length > 0) {
                    analysis += `- Assigned Employees: ${empRes.rows.length}\n  ( ${empRes.rows.map(r => r.full_name).join(', ')} )\n`;
                } else {
                    analysis += `- Assigned Employees: 0\n`;
                }
                
                return res.json({
                    success: true,
                    require_confirmation: true,
                    impact_analysis: analysis,
                    intent: 'DELETE_PROJECT',
                    module: 'projects',
                    entityId: projectIdToDelete
                });
            }

            const query = `
                DELETE FROM projects
                WHERE project_id = $1
                RETURNING *;
            `;

            console.log(query);
            console.log("Project ID:", projectIdToDelete);

            const result = await client.query(query, [projectIdToDelete]);

            resultData = result.rows[0];
            }
        else if (intent === 'ASSIGN_PROJECT') {

            operationType = 'CREATE';
            moduleName = 'assignments';

            const employeeId = await getEmployeeIdByName(
                client,
                parameters.employee_name
            );

            const projectId = await getProjectIdByName(
                client,
                parameters.project_name
            );

            if (!employeeId) {
                throw new Error("Employee not found.");
            }

            if (!projectId) {
                throw new Error("Project not found.");
            }

            const query = `
                INSERT INTO assignments
                (employee_id, project_id, role, assigned_date)
                VALUES ($1,$2,$3,$4)
                RETURNING *;
            `;

            console.log(query);

            const result = await client.query(query, [
                employeeId,
                projectId,
                parameters.role && parameters.role !== 'skip' ? parameters.role : null,
                parameters.assigned_date && parameters.assigned_date !== 'skip' ? parameters.assigned_date : null
            ]);

            resultData = result.rows[0];
            }
        else if (intent === 'VIEW_EMPLOYEES') {
            operationType = 'GET';
            moduleName = 'employees';
    const query = `
        SELECT e.employee_id, e.full_name, e.email, e.phone, e.status,
               d.department_name,
               r.role_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.department_id
        LEFT JOIN roles r ON e.role_id = r.role_id
        ORDER BY e.employee_id DESC`;
            console.log(`Chosen CRUD: SELECT employees`);
            console.log(`SQL Operation: ${query}`);
            const result = await client.query(query);
            resultData = result.rows;
        }
        else if (intent === 'VIEW_DEPARTMENTS') {
            operationType = 'GET';
            moduleName = 'departments';
            const query = `SELECT * FROM departments ORDER BY department_id DESC`;
            console.log(`Chosen CRUD: SELECT departments`);
            console.log(`SQL Operation: ${query}`);
            const result = await client.query(query);
            resultData = result.rows;
        }
        else if (intent === 'VIEW_PROJECTS') {

            operationType = 'GET';
            moduleName = 'projects';

            const query = `
                SELECT *
                FROM projects
                ORDER BY project_id DESC;
            `;

            const result = await client.query(query);

            resultData = result.rows;
        }
        else if (intent === 'VIEW_PROFILE') {
            operationType = 'GET';
            moduleName = 'employees';
            const query = `SELECT * FROM employees WHERE email = $1 LIMIT 1`;
            console.log(`Chosen CRUD: SELECT profile`);
            console.log(`SQL Operation: ${query}`);
            const result = await client.query(query, [req.user?.email || 'admin@example.com']);
            resultData = result.rows;
        }
        else if (intent === 'QUERY_ATTENDANCE') {
            operationType = 'GET';
            moduleName = 'attendance';
            
            const attendanceController = require('./attendanceController');
            let attendanceData = [];
            const mockReq = { query: { dateFilter: 'Today' } };
            const mockRes = { status: () => ({ json: (d) => { if(d.success) attendanceData = d.data; } }) };
            await attendanceController.getAll(mockReq, mockRes);
            
            const empRes = await client.query('SELECT employee_id, full_name FROM employees');
            const allEmployees = empRes.rows;

            let replyMsg = '';
            
            const qType = parameters.query_type || (parameters.status ? parameters.status : 'Working');

            if (resolvedEmployeeId) {
                const targetEmp = allEmployees.find(e => e.employee_id === resolvedEmployeeId);
                const rec = attendanceData.find(a => a.employee_id === resolvedEmployeeId);
                
                if (rec) {
                    const inStr = new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const outStr = rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                    const hrsStr = rec.working_minutes ? `${String(Math.floor(rec.working_minutes/60)).padStart(2, '0')}h ${String(Math.floor(rec.working_minutes%60)).padStart(2, '0')}m` : '--';
                    const dateStr = new Date(rec.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    
                    if (qType.toLowerCase() === 'check out' && !rec.check_out_time) {
                        replyMsg = `❌ No.\n\n${targetEmp.full_name} has not checked out yet.\n\nCurrent Status: ${rec.status}`;
                    } else if (qType.toLowerCase() === 'check out' && rec.check_out_time) {
                        replyMsg = `✅ Yes.\n\nCheck Out: ${outStr}\nWorking Hours: ${hrsStr}\nStatus: ${rec.status}`;
                    } else {
                        replyMsg = `✅ Yes.\n\nEmployee: ${targetEmp.full_name}\nDate: ${dateStr}\nStatus: ${rec.status}\nCheck In: ${inStr}\nCheck Out: ${outStr}\nWorking Time: ${hrsStr}`;
                    }
                } else {
                    replyMsg = `❌ No.\n\nEmployee: ${targetEmp.full_name}\nStatus: Absent\nCheck In: --\nCheck Out: --\nWorking Time: --`;
                }
            } else {
                if (qType.toLowerCase() === 'absent') {
                    const presentIds = attendanceData.map(a => a.employee_id);
                    const absentEmps = allEmployees.filter(e => !presentIds.includes(e.employee_id));
                    replyMsg = `🔴 Absent Today (${absentEmps.length})\n\n` + absentEmps.map(e => `• ${e.full_name}`).join('\n');
                } else if (qType.toLowerCase() === 'working') {
                    const filtered = attendanceData.filter(a => a.status === 'Working');
                    replyMsg = `🟢 Currently Working (${filtered.length})\n\n` + filtered.map(a => `• ${a.full_name}`).join('\n');
                } else if (qType.toLowerCase() === 'completed') {
                    const filtered = attendanceData.filter(a => a.status === 'Completed');
                    replyMsg = `🔵 Completed (${filtered.length})\n\n` + filtered.map(a => `• ${a.full_name}`).join('\n');
                } else {
                    replyMsg = `🟢 Present Today (${attendanceData.length})\n\n` + attendanceData.map(a => `• ${a.full_name} (${a.status})`).join('\n');
                }
            }

            resultData = [];
            customMessage = replyMsg;
        }
        else {
            throw new Error(`Execution for intent ${intent} is not supported directly yet.`);
        }

        console.log(`=========================================\n`);

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            module: moduleName,
            action: operationType,
            data: resultData,
            undoData,
            message: customMessage || "Action completed successfully"
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.log("============== ERROR ==============");
        console.log(error);
        console.log(error.message);
        console.log(error.code);
        console.log(error.detail);
        console.log(error.constraint);
        console.log("===================================");

        let userMessage = "Unable to complete the request. Please contact the administrator.";
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('email')) {
                userMessage = "This email is already registered.";
            } else {
                userMessage = "A duplicate entry already exists.";
            }
        } else if (error.code === '23503') {
            userMessage = "Invalid reference provided (e.g., department or role does not exist).";
        } else if (error.code === '42703') {
            userMessage = "Unable to complete the request. Please contact the administrator.";
        } else if (error.message) {
            userMessage = error.message;
        }

        res.status(500).json({ success: false, message: userMessage });
    } finally {
        client.release();
    }
};

exports.undoAction = async (req, res) => {
    const { operationType, moduleName, undoData } = req.body;
    if (!operationType || !moduleName || !undoData) {
        return res.status(400).json({ success: false, message: "Missing undo parameters" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (operationType === 'CREATE') {
            const { createdRecord } = undoData;
            if (createdRecord) {
                const idCol = Object.keys(createdRecord).find(k => k.endsWith('_id'));
                if (idCol) {
                    await client.query(`DELETE FROM ${moduleName} WHERE ${idCol} = $1`, [createdRecord[idCol]]);
                }
            }
        } 
        else if (operationType === 'DELETE') {
            const { deletedRecord } = undoData;
            if (deletedRecord) {
                const columns = Object.keys(deletedRecord);
                const values = columns.map(k => deletedRecord[k]);
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                await client.query(`INSERT INTO ${moduleName} (${columns.join(', ')}) VALUES (${placeholders})`, values);
            }
        } 
        else if (operationType === 'UPDATE') {
            const { previousState } = undoData;
            if (previousState) {
                const idCol = Object.keys(previousState).find(k => k.endsWith('_id'));
                const idValue = previousState[idCol];
                const columns = Object.keys(previousState).filter(k => k !== idCol);
                const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
                const values = columns.map(col => previousState[col]);
                values.push(idValue);
                await client.query(`UPDATE ${moduleName} SET ${setClause} WHERE ${idCol} = $${values.length}`, values);
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: "Action undone successfully" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Undo error:", error);
        res.status(500).json({ success: false, message: "Failed to undo action: " + error.message });
    } finally {
        client.release();
    }
};