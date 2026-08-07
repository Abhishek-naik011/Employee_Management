import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  User, Mail, Phone, Building2, Briefcase, Calendar,
  CheckCircle2, XCircle, LogOut, FolderKanban, Shield, Clock,
  ChevronRight, X, Users, Power
} from 'lucide-react';
import authFetch from '../utils/authFetch';
import FloatingChatButton from '../components/chatbot/FloatingChatButton';
import ChatPanel from '../components/chatbot/ChatPanel';
import ExportReportModal from '../components/ExportReportModal';
import { formatDate } from '../utils/dateUtils';

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
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEmployeeReportOpen, setIsEmployeeReportOpen] = useState(false);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  const fetchAttendance = async () => {
    try {
      const res = await authFetch(`/api/attendance/today?t=${Date.now()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setAttendanceRecord(data.data);
      } else {
        setAttendanceRecord(null);
      }
    } catch (err) {
      console.error('Failed to load attendance');
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const res = await authFetch(`/api/employees/me?t=${Date.now()}`);
        const data = await res.json();
        if (data.success) {
          const emp = data.data;
          if (emp.assigned_projects && typeof emp.assigned_projects === 'string') {
            try {
              emp.assigned_projects = JSON.parse(emp.assigned_projects);
            } catch (e) {
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
    fetchAttendance();

    const handleChatbotUpdate = (e) => {
      fetchProfile();
    };
    window.addEventListener('chatbot_action_success', handleChatbotUpdate);

    return () => window.removeEventListener('chatbot_action_success', handleChatbotUpdate);
  }, []);

  useEffect(() => {
    let interval = null;
    if (attendanceRecord && attendanceRecord.status === 'Working' && attendanceRecord.check_in_time) {
      const startTime = new Date(attendanceRecord.resume_start_time || attendanceRecord.check_in_time).getTime();
      const previousSeconds = (attendanceRecord.previous_working_minutes || 0) * 60;
      interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.floor((now - startTime) / 1000) + previousSeconds;
        if (diff < 0) return;
        const h = String(Math.floor(diff / 3600)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        setElapsedTime(`${h}:${m}:${s}`);
      }, 1000);
    } else if (attendanceRecord && attendanceRecord.status === 'Completed' && attendanceRecord.working_minutes != null) {
      const diff = attendanceRecord.working_minutes * 60;
      const h = String(Math.floor(diff / 3600)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
      const s = String(Math.floor(diff % 60)).padStart(2, '0');
      setElapsedTime(`${h}:${m}:${s}`);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => { if (interval) clearInterval(interval); };
  }, [attendanceRecord]);
  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    navigate('/login', { replace: true });
    window.location.reload();
  };

  const handleCheckIn = async () => {
    try {
      const res = await authFetch('/api/attendance/check-in', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAttendanceRecord(data.data);
        window.dispatchEvent(new Event('attendance_updated'));
        toast.success('Checked in successfully!');
      } else {
        toast.error(data.message || 'Check-in failed');
      }
    } catch (err) {
      toast.error('Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    try {
      const res = await authFetch('/api/attendance/check-out', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAttendanceRecord(data.data);
        window.dispatchEvent(new Event('attendance_updated'));
        setShowCheckoutConfirm(false);
        setShowCheckoutSuccess(true);
        setTimeout(() => setShowCheckoutSuccess(false), 3000);
      } else {
        toast.error(data.message || 'Check-out failed');
      }
    } catch (err) {
      toast.error('Check-out failed');
    }
  };


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
      <div className="px-4 space-y-6">

        {/* Profile Card */}
        <div className="mt-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {employee.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{employee.full_name}</h1>
                <p className="text-blue-100 text-sm mt-0.5">EMP{String(employee.employee_id).padStart(3, '0')}</p>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${employee.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {employee.status}
                </span>
                <button
                  onClick={() => {
                    console.log("Button clicked");
                    setIsEmployeeReportOpen(true);
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2 relative z-10 cursor-pointer pointer-events-auto"
                >
                  <FolderKanban className="w-4 h-4" />
                  Generate Report
                </button>
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

          {/* Today's Attendance */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Today's Attendance</h2>
                <p className="text-sm font-medium text-gray-500 mt-0.5">
                  {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col relative">
              {showCheckoutSuccess && (
                <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  ✅ Attendance recorded successfully.
                </div>
              )}
              <div className="mb-4">
                <p className="text-sm text-gray-500 font-medium">Status</p>
                <p className={`text-lg font-bold ${!attendanceRecord ? 'text-gray-400' :
                  attendanceRecord.status === 'Working' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                  {!attendanceRecord ? 'Not Checked In' : attendanceRecord.status}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">Check In</p>
                  <p className="font-semibold text-gray-900">
                    {attendanceRecord?.check_in_time ? new Date(attendanceRecord.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Check Out</p>
                  <p className="font-semibold text-gray-900">
                    {attendanceRecord?.check_out_time ? new Date(attendanceRecord.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">Working Time</p>
                  <p className="font-bold text-blue-600 font-mono tracking-wider">{elapsedTime}</p>
                </div>
              </div>

              <div className="mt-auto">
                {!attendanceRecord ? (
                  <button onClick={handleCheckIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
                    Check In
                  </button>
                ) : attendanceRecord.status === 'Working' ? (
                  <button onClick={() => setShowCheckoutConfirm(true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors">
                    Check Out
                  </button>
                ) : (
                  <button disabled className="w-full bg-gray-100 text-gray-400 font-semibold py-2.5 rounded-xl cursor-not-allowed">
                    Completed for Today
                  </button>
                )}
              </div>
            </div>
          </div>

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
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${p.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
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









        </div>
      </div>

      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          formatDate={formatDate}
        />
      )}
      <FloatingChatButton />
      <ChatPanel />
      <ExportReportModal
        open={isEmployeeReportOpen}
        onClose={() => setIsEmployeeReportOpen(false)}
        isEmployee={true}
      />

      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in zoom-in-95" onClick={() => setShowCheckoutConfirm(false)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <Power className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Check Out</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to check out for today?<br/>
              You will not be able to continue working unless an administrator resumes your attendance.
            </p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setShowCheckoutConfirm(false)} 
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCheckOut} 
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-sm"
              >
                Yes, Check Out
              </button>
            </div>
          </div>
        </div>
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
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${project.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
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
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {start}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">End Date</p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> {end}</p>
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
