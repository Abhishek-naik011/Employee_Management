import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, Building2, Briefcase, Calendar,
  CheckCircle2, XCircle, LogOut, FolderKanban, Shield, Clock,
  ChevronRight, X, Users
} from 'lucide-react';
import authFetch from '../utils/authFetch';

const API = 'http://localhost:5000/api';

const normalizePermissions = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value || '[]');
    } catch (error) {
      return [];
    }
  }
  return value || [];
};

const PERMISSION_ROUTES = {
  'View Employees': '/portal/employees',
  'View Departments': '/portal/departments',
  'Manage Departments': '/portal/departments',
  'View Projects': '/portal/projects',
  'Manage Projects': '/portal/projects',
  'Assign Employees': '/portal/projects',
  'View Assigned Projects': '/portal/projects',
  'View Assigned Project': '/portal/projects', // Fallback for old DB rows
  'Manage Roles': '/portal/roles',
  'Manage Profile': '/portal/profile',
  'View Reports': '/portal/reports'
};

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authFetch(`${API}/employees/me`);
        const data = await res.json();
        if (data.success) {
          const emp = data.data;
          // Ensure assigned_projects is an array (parse if it's a JSON string)
          if (emp.assigned_projects && typeof emp.assigned_projects === 'string') {
            try {
              emp.assigned_projects = JSON.parse(emp.assigned_projects);
            } catch (e) {
              console.error('Failed to parse assigned_projects', e);
              emp.assigned_projects = [];
            }
          }
          setEmployee(emp);
        } else {
          toast.error('Failed to load profile');
        }
      } catch (err) {
        toast.error('Could not connect to server.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    navigate('/login', { replace: true });
    window.location.reload();
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
  const permissions = normalizePermissions(employee?.permissions);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-red-600">Could not load your profile. Please try logging in again.</p>
      </div>
    );
  }

  const projects = employee.assigned_projects || [];

  const handlePermissionClick = (perm) => {
    if (!permissions.includes(perm)) {
      toast.error("You don't have permission.");
      return;
    }
    
    // Centralized lookup guarantees consistent routing for all permissions
    const routePath = PERMISSION_ROUTES[perm];
    if (routePath) {
      navigate(routePath);
    } else {
      toast.error("Module not found for this permission");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">EmpManage</span>
          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full ml-2">Employee Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{employee.full_name}</p>
            <p className="text-xs text-gray-500">{employee.role_name || storedUser.role_name || 'Employee'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {employee.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{employee.full_name}</h1>
                <p className="text-blue-100 text-sm mt-0.5">EMP{String(employee.employee_id).padStart(3, '0')}</p>
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${employee.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {employee.status}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {[
              { icon: Mail, label: 'Email', value: employee.email },
              { icon: Phone, label: 'Phone', value: employee.phone || 'N/A' },
              { icon: Building2, label: 'Department', value: employee.department_name || 'N/A' },
              { icon: Briefcase, label: 'Company Role', value: employee.role_name || storedUser.role_name || 'N/A' },
              { icon: Calendar, label: 'Joining Date', value: formatDate(employee.joining_date) },
              { icon: User, label: 'Employee ID', value: `EMP${String(employee.employee_id).padStart(3, '0')}` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="px-6 py-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 break-all">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Assigned Projects */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">Assigned Projects</h2>
              <span className="ml-auto text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{projects.length}</span>
            </div>
            <div className="p-6">
              {projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.map((p, i) => {
                    const start = p.start_date ? formatDate(p.start_date) : null;
                    const end = p.end_date ? formatDate(p.end_date) : 'Ongoing';
                    return (
                      <div 
                        key={i} 
                        onClick={() => setSelectedProject(p)}
                        className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all group"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5 group-hover:scale-125 transition-transform"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">{p.project_name}</p>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                              p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                              p.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{p.status}</span>
                          </div>
                          {p.client_name && <p className="text-xs text-gray-500 mt-0.5">Client: {p.client_name}</p>}
                          {p.manager_name && <p className="text-xs text-gray-500 mt-0.5">Manager: {p.manager_name}</p>}
                          {start && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <Clock className="w-3 h-3" />
                              {start} → {end}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 italic">No Projects Assigned</p>
                </div>
              )}
            </div>
          </div>

          {/* Role & Permissions */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">Role & Permissions</h2>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Assigned Role</p>
                  <p className="text-sm font-bold text-blue-900">{employee.role_name || 'No Role Assigned'}</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Permissions</p>
              {permissions.length > 0 ? (
                <div className="space-y-2">
                  {/* Only render cards for permissions the employee's role ACTUALLY has.
                      This automatically reflects any admin changes on next login/refresh. */}
                  {permissions.map((perm, i) => {
                    // Every assigned permission is now dynamically routable
                    return (
                      <div
                        key={i}
                        onClick={() => handlePermissionClick(perm)}
                        className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all bg-white border-emerald-200 hover:border-emerald-300 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span className="text-sm font-medium text-gray-900">{perm}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <XCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 italic">No permissions configured for this role</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {selectedProject && (
        <ProjectDetailsModal 
          project={selectedProject} 
          onClose={() => setSelectedProject(null)} 
          formatDate={formatDate} 
        />
      )}
    </div>
  );
};

const ProjectDetailsModal = ({ project, onClose, formatDate }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await authFetch(`${API}/assignments?project_id=${project.project_id}`);
        const data = await res.json();
        if (data.success) {
          setMembers(data.data);
        }
      } catch (err) {
        toast.error('Failed to load project members');
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [project.project_id]);

  const start = project.start_date ? formatDate(project.start_date) : 'N/A';
  const end = project.end_date ? formatDate(project.end_date) : 'Ongoing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b flex justify-between items-start bg-gray-50/50 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-xl">{project.project_name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Project Code: {project.project_code || 'N/A'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                project.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                project.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-200 text-gray-700'
              }`}>{project.status || 'Unknown'}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Client</p>
              <p className="text-sm font-semibold text-gray-900">{project.client_name || 'Internal'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Date</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400"/> {start}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400"/> {end}</p>
            </div>
          </div>

          <div>
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4 border-b pb-2">
              <Users className="w-5 h-5 text-blue-600" />
              People Working On This Project
            </h4>
            
            {loading ? (
              <div className="flex justify-center p-6">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : members.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map(m => (
                  <div key={m.assignment_id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 shadow-sm rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                      {(m.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{m.full_name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No one assigned to this project.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
