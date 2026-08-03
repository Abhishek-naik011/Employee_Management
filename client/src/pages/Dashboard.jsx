import { useState, useEffect, useRef, useCallback } from 'react';
import { Users, Building2, FolderKanban, ShieldCheck, TrendingUp, MoreVertical, UserCircle, Eye, Edit2, Trash2, AlertTriangle, X, Save, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usePermission } from '../context/PermissionContext';
import { createPortal } from 'react-dom';

const API = 'http://localhost:5000/api';

// ─── Clickable Stat Card ────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, trend, onClick }) => (
  <motion.div
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group cursor-pointer select-none"
  >
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${color}`}></div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div className="flex items-center text-sm font-medium text-emerald-600 relative z-10">
      <TrendingUp className="w-4 h-4 mr-1" />
      <span>{trend}</span>
      <span className="text-gray-400 font-normal ml-2">vs last month</span>
    </div>
  </motion.div>
);

// ─── Employee View Modal ────────────────────────────────────────────────────
const ViewModal = ({ employee, onClose }) => {
  if (!employee) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Employee Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 flex items-center justify-center font-bold text-blue-700 text-2xl shadow-sm border border-blue-200">
              {employee.full_name.charAt(0)}
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{employee.full_name}</h4>
              <p className="text-gray-500 text-sm">{employee.role_name || employee.designation || ''}</p>
              <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {employee.status}
              </span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Employee ID</span><span className="text-gray-900 font-semibold">EMP{String(employee.employee_id).padStart(3,'0')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Email</span><span className="text-gray-900">{employee.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Phone</span><span className="text-gray-900">{employee.phone || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Department</span><span className="text-gray-900">{employee.department_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Company Role</span><span className="text-gray-900">{employee.role_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Joining Date</span><span className="text-gray-900">{employee.joining_date ? new Date(employee.joining_date).toLocaleDateString() : 'N/A'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Employee Edit Modal ────────────────────────────────────────────────────
const EditModal = ({ employee, departments, roles = [], onClose, onSave }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      full_name: employee?.full_name || '',
      designation: employee?.designation || '',
      department_id: employee?.department_id || '',
      role_id: employee?.role_id || '',
      status: employee?.status || 'Active',
      email: employee?.email || '',
      phone: employee?.phone || '',
    }
  });

  const onSubmit = (data) => { onSave({ ...employee, ...data, role: data.designation }); };

  if (!employee) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Edit Employee</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input type="text" {...register('full_name', { required: true })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" {...register('email')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input type="text" {...register('phone')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation</label>
              <input type="text" {...register('designation', { required: true })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
              <select {...register('department_id')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">System Role</label>
              <select {...register('role_id')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Role</option>
                {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select {...register('status')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl shadow-sm transition-colors">
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Confirm Dialog ──────────────────────────────────────────────────
const DeleteDialog = ({ employee, onClose, onConfirm }) => {
  if (!employee) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Employee?</h3>
        <p className="text-gray-500 mb-6">
          Are you sure you want to delete <span className="font-bold text-gray-900">{employee.full_name}</span>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(employee)} className="flex-1 px-4 py-3 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl shadow-sm transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Three-dot Action Menu ──────────────────────────────────────────────────
const ActionMenu = ({ employee, onView, onEdit, onDelete, canManage }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, right: 0, upward: false });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const handleEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const toggleMenu = () => {
    if (!open) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const upward = spaceBelow < 180 && spaceAbove > 180;
      setCoords({
        top: upward ? rect.top + window.scrollY - 4 : rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right,
        upward
      });
    }
    setOpen(!open);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={toggleMenu} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
        <MoreVertical className="w-5 h-5" />
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ 
            top: coords.top, 
            right: coords.right,
            position: 'absolute',
            transform: coords.upward ? 'translateY(-100%)' : 'none'
          }}
          className="w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-[9999] py-1"
        >
          <button onClick={() => { setOpen(false); onView(employee); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Eye className="w-4 h-4 text-blue-500" /> View Employee
          </button>
          {canManage && (
            <>
              <button onClick={() => { setOpen(false); onEdit(employee); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit2 className="w-4 h-4 text-gray-500" /> Edit Employee
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button onClick={() => { setOpen(false); onDelete(employee); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" /> Delete Employee
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── Dashboard Page ─────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canManageEmployees = true; // Admin dashboard is always admin

  const [recentEmployees, setRecentEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    activeProjects: 0,
    totalRoles: 0
  });

  const [viewEmployee, setViewEmployee] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);
  const [deleteEmployee, setDeleteEmployee] = useState(null);

  const [deptList, setDeptList] = useState([]);
  const [roleList, setRoleList] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [empRes, deptRes, projRes, roleRes] = await Promise.all([
        fetch(`${API}/employees`),
        fetch(`${API}/departments`),
        fetch(`${API}/projects`),
        fetch(`${API}/roles`),
      ]);

      const [empData, deptData, projData, roleData] = await Promise.all([
        empRes.json(), deptRes.json(), projRes.json(), roleRes.json()
      ]);

      const emps = empData.success ? empData.data : [];
      const depts = deptData.success ? deptData.data : [];
      const projs = projData.success ? projData.data : [];
      const roles = roleData.success ? roleData.data : [];

      setStats({
        totalEmployees: emps.length,
        totalDepartments: depts.length,
        activeProjects: projs.filter(p => p.status === 'Active').length,
        totalRoles: roles.length
      });

      setRecentEmployees(emps.slice(0, 5));
      setDeptList(depts);
      setRoleList(roles);

      // Department distribution
      const deptCounts = emps.reduce((acc, emp) => {
        const d = emp.department_name;
        if (d) acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});

      const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-orange-500'];
      const maxCount = Math.max(...Object.values(deptCounts), 1);

      const dist = Object.entries(deptCounts).map(([name, count], idx) => ({
        name,
        count,
        color: colors[idx % colors.length],
        width: `${Math.round((count / maxCount) * 100)}%`
      }));

      setDepartments(dist);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveEdit = useCallback(async (updated) => {
    try {
      const res = await fetch(`${API}/employees/${updated.employee_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: updated.full_name,
          email: updated.email,
          phone: updated.phone,
          designation: updated.role,
          department_id: updated.department_id || null,
          role_id: updated.role_id || null,
          joining_date: updated.joining_date,
          status: updated.status,
          salary: updated.salary,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setEditEmployee(null);
        toast.success(`${updated.full_name} updated successfully!`);
        loadData();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to update employee');
    }
  }, [loadData]);

  const handleConfirmDelete = useCallback(async (emp) => {
    try {
      const res = await fetch(`${API}/employees/${emp.employee_id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setDeleteEmployee(null);
        toast.success(`${emp.full_name} has been removed.`);
        loadData();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to delete employee');
    }
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-500 mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <button
          onClick={() => toast.success('Report generation coming soon!')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm shadow-blue-200 transition-all"
        >
          Generate Report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Employees" value={stats.totalEmployees} icon={Users} color="bg-blue-500" trend="+12%" onClick={() => navigate('/employees')} />
        <StatCard title="Total Departments" value={stats.totalDepartments} icon={Building2} color="bg-indigo-500" trend="+2%" onClick={() => navigate('/departments')} />
        <StatCard title="Active Projects" value={stats.activeProjects} icon={FolderKanban} color="bg-emerald-500" trend="+5%" onClick={() => navigate('/projects?status=Active')} />
        <StatCard title="Total Roles" value={stats.totalRoles} icon={ShieldCheck} color="bg-purple-500" trend="+1%" onClick={() => navigate('/roles')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Employees Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Recent Employees</h3>
            <button onClick={() => navigate('/employees')} className="text-blue-600 text-sm font-medium hover:underline">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100">Name</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100">Role</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100">Department</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 border-b border-gray-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentEmployees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{emp.full_name}</p>
                          <p className="text-xs text-gray-500">EMP{String(emp.employee_id).padStart(3,'0')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-50 text-sm text-gray-600">{emp.role_name || 'N/A'}</td>
                    <td className="px-6 py-4 border-b border-gray-50 text-sm text-gray-600">{emp.department_name || 'N/A'}</td>
                    <td className="px-6 py-4 border-b border-gray-50">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 border-b border-gray-50 text-right">
                      <ActionMenu
                        employee={emp}
                        onView={setViewEmployee}
                        onEdit={setEditEmployee}
                        onDelete={setDeleteEmployee}
                        canManage={canManageEmployees}
                      />
                    </td>
                  </tr>
                ))}
                {recentEmployees.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No recent employees</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Department Distribution */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Department Distribution</h3>
            <div className="space-y-4">
              {departments.map((dept) => (
                <div
                  key={dept.name}
                  className="cursor-pointer group"
                  onClick={() => navigate(`/employees?dept=${encodeURIComponent(dept.name)}`)}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{dept.name}</span>
                    <span className="text-gray-500">{dept.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${dept.color} h-2 rounded-full group-hover:opacity-80 transition-opacity`} style={{ width: dept.width }}></div>
                  </div>
                </div>
              ))}
              {departments.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">No department data</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ViewModal employee={viewEmployee} onClose={() => setViewEmployee(null)} />
      <EditModal employee={editEmployee} departments={deptList} roles={roleList} onClose={() => setEditEmployee(null)} onSave={handleSaveEdit} />
      <DeleteDialog employee={deleteEmployee} onClose={() => setDeleteEmployee(null)} onConfirm={handleConfirmDelete} />
    </div>
  );
};

export default Dashboard;
