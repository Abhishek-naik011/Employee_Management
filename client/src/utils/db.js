const MOCK_EMPLOYEES = Array.from({ length: 25 }, (_, i) => ({
  id: `EMP${String(i + 1).padStart(3, '0')}`,
  name: ['Rahul Sharma', 'Priya Singh', 'Amit Patel', 'Neha Gupta', 'Vikram Singh', 'Ananya Desai', 'Rohan Mehta', 'Sneha Kapoor', 'Karan Verma', 'Pooja Joshi'][i % 10] + (i > 9 ? ` ${i}` : ''),
  email: `user${i+1}@company.com`,
  phone: `+91 9876543${String(i).padStart(3, '0')}`,
  department: ['Software Development', 'Human Resources', 'Marketing', 'Sales'][i % 4],
  project: ['Employee Portal', 'Cloud Migration', 'Q3 Campaign', 'Sales Dashboard', 'None'][i % 5],
  designation: ['Frontend Developer', 'HR Manager', 'Backend Developer', 'Marketing Specialist', 'Sales Lead', 'UI/UX Designer'][i % 6],
  status: i % 7 === 0 ? 'Inactive' : 'Active',
  joiningDate: `2023-${String((i%12)+1).padStart(2, '0')}-${String((i%28)+1).padStart(2, '0')}`,
  salary: 50000 + (i * 2500),
  role: ['Admin', 'HR Manager', 'Project Manager', 'Team Lead', 'Employee'][i % 5]
}));

const MOCK_PROJECTS = [
  { id: 'PRJ01', name: 'Employee Portal', code: 'PRJ-EP', client: 'Internal', start: '2025-01-10', end: '2025-12-31', status: 'Active', members: 0 },
  { id: 'PRJ02', name: 'Cloud Migration', code: 'PRJ-CM', client: 'TechCorp', start: '2025-03-01', end: '2026-06-30', status: 'Active', members: 0 },
  { id: 'PRJ03', name: 'Q3 Marketing', code: 'PRJ-MKT', client: 'RetailInc', start: '2025-07-01', end: '2025-09-30', status: 'Completed', members: 0 },
  { id: 'PRJ04', name: 'Sales Dashboard', code: 'PRJ-SD', client: 'Internal', start: '2025-08-15', end: '2025-11-30', status: 'On Hold', members: 0 }
];

export const initializeDB = () => {
  if (!localStorage.getItem('employees')) {
    localStorage.setItem('employees', JSON.stringify(MOCK_EMPLOYEES));
  }
  if (!localStorage.getItem('projects')) {
    localStorage.setItem('projects', JSON.stringify(MOCK_PROJECTS));
  }
  if (!localStorage.getItem('assignments')) {
    localStorage.setItem('assignments', JSON.stringify([]));
  }
};

const notifyChange = (entity) => {
  window.dispatchEvent(new Event(`${entity}Changed`));
};

export const db = {
  getEmployees: () => JSON.parse(localStorage.getItem('employees')) || [],
  saveEmployees: (employees) => {
    localStorage.setItem('employees', JSON.stringify(employees));
    notifyChange('employees');
  },
  
  getProjects: () => {
    const projects = JSON.parse(localStorage.getItem('projects')) || [];
    const assignments = db.getAssignments();
    // Update members count based on assignments
    return projects.map(p => ({
      ...p,
      members: assignments.filter(a => a.project_id === p.id).length
    }));
  },
  saveProjects: (projects) => {
    localStorage.setItem('projects', JSON.stringify(projects));
    notifyChange('projects');
  },

  getAssignments: () => JSON.parse(localStorage.getItem('assignments')) || [],
  saveAssignments: (assignments) => {
    localStorage.setItem('assignments', JSON.stringify(assignments));
    notifyChange('assignments');
    notifyChange('projects'); // Projects members count changed
    notifyChange('employees'); // Employee assignments changed
  }
};
