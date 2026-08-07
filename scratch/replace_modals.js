const fs = require('fs');
const glob = require('glob');

const files = [
  'client/src/components/ExportReportModal.jsx',
  'client/src/pages/AdminAttendance.jsx',
  'client/src/pages/Dashboard.jsx',
  'client/src/pages/Departments.jsx',
  'client/src/pages/EmployeeAttendance.jsx',
  'client/src/pages/EmployeeDashboard.jsx',
  'client/src/pages/Employees.jsx',
  'client/src/pages/Projects.jsx',
  'client/src/pages/Roles.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes("import Modal from")) {
    // We add import Modal if not there.
    // Let's add it near other component imports
    if (file.includes("components/ExportReportModal")) {
       content = content.replace("import DatePicker", "import Modal from './common/Modal';\nimport DatePicker");
    } else {
       content = content.replace("import DatePicker", "import Modal from '../components/common/Modal';\nimport DatePicker");
    }
  }

  // Regex to match the outer modal wrapper and inner modal wrapper
  // Outer: <div className="fixed inset-0 ... bg-gray-900/40 backdrop-blur-sm[^"]*" onClick={...}> (onClick optional)
  // Inner: <div className="bg-white rounded-3xl [^"]*" onClick={e => e.stopPropagation()}> (onClick optional)
  
  // It's safer to just do it manually with your multi_replace tool instead of string matching here to avoid destroying files.
});
