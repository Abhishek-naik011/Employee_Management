export const workflowConfig = {
  CREATE_EMPLOYEE: {
    title: 'Create Employee',
    icon: '👤',
    steps: [
      { key: 'name', label: 'Employee Name', prompt: 'Enter employee name.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Name is required' } },
      { key: 'email', label: 'Email', prompt: 'Enter employee email.', validate: (v) => /^\S+@\S+\.\S+$/.test(v) ? { valid: true } : { valid: false, error: 'Enter a valid email address' } },
      { key: 'phone', label: 'Phone', prompt: 'Enter phone number (10 digits).', validate: (v) => /^\d{10}$/.test(v) ? { valid: true } : { valid: false, error: 'Phone must be 10 digits' } },
      { key: 'department', label: 'Department', prompt: 'Enter department name (e.g., IT, HR).', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Department is required' } },
      { key: 'role', label: 'Role', prompt: 'Enter role name (e.g., Developer, Manager).', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Role is required' } },
      { key: 'salary', label: 'Salary', prompt: 'Enter salary.', validate: (v) => !isNaN(v) && Number(v) > 0 ? { valid: true } : { valid: false, error: 'Salary must be a positive number' } },
    ]
  },
  CREATE_DEPARTMENT: {
    title: 'Create Department',
    icon: '🏢',
    steps: [
      { key: 'department_name', label: 'Department Name', prompt: 'Enter department name.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'department_code', label: 'Department Code', prompt: 'Enter department code (e.g., IT-01).', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'department_head', label: 'Department Head', prompt: 'Enter department head name.', optional: true, validate: () => ({ valid: true }) },
      { key: 'description', label: 'Description', prompt: 'Enter description.', optional: true, validate: () => ({ valid: true }) }
    ]
  },
  CREATE_ROLE: {
    title: 'Create Role',
    icon: '🛡️',
    steps: [
      { key: 'role_name', label: 'Role Name', prompt: 'Enter role name.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'description', label: 'Description', prompt: 'Enter description.', optional: true, validate: () => ({ valid: true }) },
      { key: 'permissions', type: 'multiselect', label: 'Permissions', prompt: 'Select permissions from the list below.', optional: true, validate: () => ({ valid: true }) }
    ]
  },
  CREATE_PROJECT: {
    title: 'Create Project',
    icon: '📁',
    steps: [
      { key: 'project_name', label: 'Project Name', prompt: 'Enter project name.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'project_code', label: 'Project Code', prompt: 'Enter project code.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'client_name', label: 'Client Name', prompt: 'Enter client name.', optional: true, validate: () => ({ valid: true }) },
      { key: 'start_date', label: 'Start Date', prompt: 'Enter start date (YYYY-MM-DD).', optional: true, validate: (v) => !v || v.toLowerCase() === 'skip' || /^\d{4}-\d{2}-\d{2}$/.test(v) ? { valid: true } : { valid: false, error: 'Format YYYY-MM-DD required' } },
      { key: 'end_date', label: 'End Date', prompt: 'Enter end date (YYYY-MM-DD).', optional: true, validate: (v) => !v || v.toLowerCase() === 'skip' || /^\d{4}-\d{2}-\d{2}$/.test(v) ? { valid: true } : { valid: false, error: 'Format YYYY-MM-DD required' } },
      { key: 'status', label: 'Status', prompt: 'Enter status (e.g., Active, Inactive).', optional: true, validate: () => ({ valid: true }) }
    ]
  },
  ASSIGN_PROJECT: {
    title: 'Assign Project',
    icon: '📌',
    steps: [
      { key: 'employee_name', label: 'Employee Name', prompt: 'Enter employee name to assign.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'project_name', label: 'Project Name', prompt: 'Enter project name.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'role', label: 'Role in Project', prompt: 'Enter role in project.', optional: true, validate: () => ({ valid: true }) },
      { key: 'assigned_date', label: 'Assigned Date', prompt: 'Enter assigned date (YYYY-MM-DD).', optional: true, validate: (v) => !v || v.toLowerCase() === 'skip' || /^\d{4}-\d{2}-\d{2}$/.test(v) ? { valid: true } : { valid: false, error: 'Format YYYY-MM-DD required' } }
    ]
  },
  DELETE_EMPLOYEE: {
    title: 'Delete Employee',
    icon: '🗑️',
    steps: [{ key: 'id', label: 'Employee Name', prompt: 'Enter employee name to delete.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } }]
  },
  DELETE_DEPARTMENT: {
    title: 'Delete Department',
    icon: '🗑️',
    steps: [{ key: 'id', label: 'Department Name', prompt: 'Enter department name to delete.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } }]
  },
  DELETE_ROLE: {
    title: 'Delete Role',
    icon: '🗑️',
    steps: [{ key: 'id', label: 'Role Name', prompt: 'Enter role name to delete.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } }]
  },
  DELETE_PROJECT: {
    title: 'Delete Project',
    icon: '🗑️',
    steps: [{ key: 'id', label: 'Project Name', prompt: 'Enter project name to delete.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } }]
  },
  UPDATE_EMPLOYEE: {
    title: 'Update Employee',
    icon: '✏️',
    steps: [
      { key: 'name', label: 'Employee to Update', prompt: 'Enter name of employee to update.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'selected_fields', type: 'multiselect', label: 'Fields to Update', prompt: 'Select the fields you want to update.', options: ['Email', 'Phone', 'Department', 'Role', 'Salary', 'Status'], validate: (v) => v && v.length > 0 ? { valid: true } : { valid: false, error: 'Select at least one field' } },
      { key: 'new_email', label: 'New Email', prompt: 'Enter new email.', condition: (data) => data.selected_fields?.includes('Email'), validate: (v) => /^\S+@\S+\.\S+$/.test(v) ? { valid: true } : { valid: false, error: 'Invalid email' } },
      { key: 'new_phone', label: 'New Phone', prompt: 'Enter new phone.', condition: (data) => data.selected_fields?.includes('Phone'), validate: (v) => /^\d{10}$/.test(v) ? { valid: true } : { valid: false, error: '10 digits required' } },
      { key: 'new_department', label: 'New Department', prompt: 'Enter new department name.', condition: (data) => data.selected_fields?.includes('Department'), validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'new_role', label: 'New Role', prompt: 'Enter new role name.', condition: (data) => data.selected_fields?.includes('Role'), validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'new_salary', label: 'New Salary', prompt: 'Enter new salary.', condition: (data) => data.selected_fields?.includes('Salary'), validate: (v) => (!isNaN(v) && Number(v) > 0) ? { valid: true } : { valid: false, error: 'Numeric required' } },
      { key: 'new_status', label: 'New Status', prompt: 'Enter new status (Active/Inactive).', condition: (data) => data.selected_fields?.includes('Status'), validate: (v) => /^(Active|Inactive)$/i.test(v) ? { valid: true } : { valid: false, error: 'Active or Inactive required' } },
    ]
  },
  UPDATE_DEPARTMENT: {
    title: 'Update Department',
    icon: '✏️',
    steps: [
      { key: 'name', label: 'Department to Update', prompt: 'Enter name of department to update.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'department_info', type: 'info', label: 'Department Details', prompt: '', optional: true, validate: () => ({ valid: true }) },
      { key: 'selected_fields', type: 'multiselect', label: 'Fields to Update', prompt: 'Select the fields you want to update.', options: ['Department Name', 'Description', 'Department Head'], validate: (v) => v && v.length > 0 ? { valid: true } : { valid: false, error: 'Select at least one field' } },
      { key: 'new_department_name', label: 'New Name', prompt: 'Enter new department name.', condition: (data) => data.selected_fields?.includes('Department Name'), validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'new_head', label: 'New Head', prompt: 'Enter new department head name.', condition: (data) => data.selected_fields?.includes('Department Head'), validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'new_description', label: 'New Description', prompt: 'Enter new description.', condition: (data) => data.selected_fields?.includes('Description'), validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } }
    ]
  },
  UPDATE_ROLE: {
    title: 'Update Role',
    icon: '✏️',
    steps: [
      { key: 'role_name', label: 'Role to Update', prompt: 'Enter name of role to update.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'role_info', type: 'info', label: 'Role Details', prompt: '', optional: true, validate: () => ({ valid: true }) },
      { key: 'selected_fields', type: 'multiselect', label: 'Fields to Update', prompt: 'Select the fields you want to update.', options: ['Role Name', 'Description', 'Permissions'], validate: (v) => v && v.length > 0 ? { valid: true } : { valid: false, error: 'Select at least one field' } },
      { key: 'new_role_name', label: 'New Name', prompt: 'Enter new name.', condition: (data) => data.selected_fields?.includes('Role Name'), validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'description', label: 'New Description', prompt: 'Enter new description.', condition: (data) => data.selected_fields?.includes('Description'), validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'permissions', type: 'multiselect', label: 'New Permissions', prompt: 'Select new permissions.', condition: (data) => data.selected_fields?.includes('Permissions'), validate: () => ({ valid: true }) }
    ]
  },
  UPDATE_PROJECT: {
    title: 'Update Project',
    icon: '✏️',
    steps: [
      { key: 'target_name', label: 'Project to Update', prompt: 'Enter name of project to update.', validate: (v) => v.trim() ? { valid: true } : { valid: false, error: 'Required' } },
      { key: 'new_project_name', label: 'New Name', prompt: 'Enter new name (or type "skip").', optional: true, validate: () => ({ valid: true }) },
      { key: 'new_client_name', label: 'New Client', prompt: 'Enter new client (or type "skip").', optional: true, validate: () => ({ valid: true }) },
      { key: 'new_start_date', label: 'New Start Date', prompt: 'Enter new start date (YYYY-MM-DD) or "skip".', optional: true, validate: (v) => !v || v.toLowerCase() === 'skip' || /^\d{4}-\d{2}-\d{2}$/.test(v) ? { valid: true } : { valid: false, error: 'Format YYYY-MM-DD required' } },
      { key: 'new_end_date', label: 'New End Date', prompt: 'Enter new end date (YYYY-MM-DD) or "skip".', optional: true, validate: (v) => !v || v.toLowerCase() === 'skip' || /^\d{4}-\d{2}-\d{2}$/.test(v) ? { valid: true } : { valid: false, error: 'Format YYYY-MM-DD required' } },
      { key: 'new_status', label: 'New Status', prompt: 'Enter new status (or type "skip").', optional: true, validate: () => ({ valid: true }) }
    ]
  },
  GET_EMPLOYEES: {
    title: 'View Employees',
    icon: '📋',
    steps: [
      { key: 'department', label: 'Department Filter', prompt: 'Enter department to filter by (or type "skip" for all).', optional: true, validate: () => ({ valid: true }) }
    ]
  },
  GET_DEPARTMENTS: {
    title: 'View Departments',
    icon: '🏢',
    steps: [
      { key: 'name', label: 'Search Name', prompt: 'Enter department name to search (or type "skip" for all).', optional: true, validate: () => ({ valid: true }) }
    ]
  },
  GET_PROJECTS: {
    title: 'View Projects',
    icon: '📂',
    steps: [
      { key: 'status', label: 'Status Filter', prompt: 'Enter status to filter (or type "skip" for all).', optional: true, validate: () => ({ valid: true }) }
    ]
  }
};
