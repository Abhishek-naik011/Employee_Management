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
import { ChatbotProvider } from './context/ChatbotContext';

import Employees from './pages/Employees';
import Departments from './pages/Departments';
import Projects from './pages/Projects';
import Profile from './pages/Profile';
import Roles from './pages/Roles';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Register from './pages/Register';
import AdminAttendance from './pages/AdminAttendance';
import EmployeeAttendance from './pages/EmployeeAttendance';

const RootRedirect = () => {
  const { user, loading } = usePermission();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={user.role_name === 'Admin' ? '/dashboard' : '/employee-dashboard'}
      replace
    />
  );
};

const AttendanceRouter = () => {
  const { hasPermission, user } = usePermission();
  if (!user) return null;

  const canManageReg = hasPermission('Manage Attendance Regularization');
  
  if (canManageReg) {
    return <AdminAttendance />;
  }
  
  return <EmployeeAttendance />;
};

function App() {
  return (
    <Router>
      <PermissionProvider>
        <ChatbotProvider>
          <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">

            <Routes>

              <Route path="/" element={<RootRedirect />} />

              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/change-password" element={<ChangePassword />} />

              {/* ---------------- Admin ---------------- */}

              <Route element={<ProtectedRoute adminOnly={true} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/attendance" element={<AdminAttendance />} />
                  <Route path="/departments" element={<Departments />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/roles" element={<Roles />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>

              {/* ---------------- Employee ---------------- */}

              <Route element={<ProtectedRoute />}>
                <Route element={<EmployeePortalLayout />}>
                  <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
                  <Route element={<PermissionRoute permission="View Employees" />}>
                    <Route
                      path="/portal/employees"
                      element={<Employees />}
                    />
                  </Route>

                  <Route
                    element={
                      <PermissionRoute
                        permission={[
                          "View Departments",
                          "Manage Departments"
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/portal/departments"
                      element={<Departments />}
                    />
                  </Route>

                  <Route
                    element={
                      <PermissionRoute
                        permission={[
                          "View Projects",
                          "Manage Projects",
                          "View Assigned Projects",
                          "View Assigned Project",
                          "Assign Employees"
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/portal/projects"
                      element={<Projects />}
                    />
                  </Route>

                  <Route
                    element={<PermissionRoute permission="Manage Roles" />}
                  >
                    <Route
                      path="/portal/roles"
                      element={<Roles />}
                    />
                  </Route>

                    <Route path="/portal/profile" element={<Profile />} />

                  <Route
                    element={<PermissionRoute permission="View Reports" />}
                  >
                    <Route
                      path="/portal/reports"
                      element={
                        <div className="p-8 text-center text-gray-500">
                          Reports Module (Coming Soon)
                        </div>
                      }
                    />
                  </Route>
                  
                  <Route path="/portal/attendance" element={<AttendanceRouter />} />

                </Route>
              </Route>

              <Route
                path="*"
                element={
                  <div className="flex h-screen items-center justify-center">
                    <h1>404 Not Found</h1>
                  </div>
                }
              />

            </Routes>

            <Toaster position="top-right" />

          </div>
        </ChatbotProvider>
      </PermissionProvider>
    </Router>
  );
}

export default App;