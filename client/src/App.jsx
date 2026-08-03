import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import DashboardLayout from './layouts/DashboardLayout';
import EmployeePortalLayout from './layouts/EmployeePortalLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import { usePermission, PermissionProvider } from './context/PermissionContext';

import Employees from './pages/Employees';
import Departments from './pages/Departments';
import Projects from './pages/Projects';
import Profile from './pages/Profile';
import Roles from './pages/Roles';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Register from './pages/Register';

const RootRedirect = () => {
  const { user, loading } = usePermission();

  if (loading) return null; // or a loader

  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={user.role_name === 'Admin' ? '/dashboard' : '/employee-dashboard'} replace />;
};



function App() {
  return (
    <Router>
      <PermissionProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Admin-only routes */}
          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* Employee portal routes — each page guarded by its own permission */}
          <Route element={<ProtectedRoute />}>
            <Route path="/employee-dashboard" element={<EmployeeDashboard />} />

            <Route element={<EmployeePortalLayout />}>
              <Route element={<PermissionRoute permission="View Employees" />}>
                <Route path="/portal/employees" element={<Employees />} />
              </Route>

              <Route element={<PermissionRoute permission={["View Departments", "Manage Departments"]} />}>
                <Route path="/portal/departments" element={<Departments />} />
              </Route>

              <Route element={<PermissionRoute permission={["View Projects", "Manage Projects", "View Assigned Projects", "View Assigned Project", "Assign Employees"]} />}>
                <Route path="/portal/projects" element={<Projects />} />
              </Route>

              <Route element={<PermissionRoute permission="Manage Roles" />}>
                <Route path="/portal/roles" element={<Roles />} />
              </Route>

              <Route element={<PermissionRoute permission="Manage Profile" />}>
                <Route path="/portal/profile" element={<Profile />} />
              </Route>

              <Route element={<PermissionRoute permission="View Reports" />}>
                <Route path="/portal/reports" element={<div className="p-8 text-center text-gray-500">Reports Module (Coming Soon)</div>} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<div className="flex h-screen items-center justify-center"><h1>404 Not Found</h1></div>} />
        </Routes>
        <Toaster position="top-right" />
      </div>
      </PermissionProvider>
    </Router>
  );
}

export default App;