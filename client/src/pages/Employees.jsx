import { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Edit2, Trash2, Eye, Filter,
  ChevronLeft, ChevronRight, X, AlertTriangle, Users, Save
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import authFetch from '../utils/authFetch';
import { generateTemporaryPassword } from '../utils/password';
import { usePermission } from '../context/PermissionContext';
import PermissionGate from '../components/PermissionGate';
import PrimaryButton from '../components/common/PrimaryButton';
import SecondaryButton from '../components/common/SecondaryButton';

const API = import.meta.env.VITE_API_URL;
const MASKED_PASSWORD = '************';

const maskPassword = (value) => (value ? '*'.repeat(Math.max(8, Math.min(value.length, 12))) : MASKED_PASSWORD);

// ─── View Employee Modal ────────────────────────────────────────────────────
const ViewModal = ({
  employee,
  temporaryPassword,
  onClose,
  onCopyPassword,
  onPasswordAction,
  isPasswordActionLoading
}) => {
  const { user } = usePermission();
  if (!employee) return null;
  const hasPassword = Boolean(employee.has_password || temporaryPassword);
  const displayedPassword = temporaryPassword ? temporaryPassword : (hasPassword ? MASKED_PASSWORD : '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95" onClick={(event) => event.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h3 className="text-xl font-bold text-gray-900">Employee Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 flex items-center justify-center font-bold text-blue-700 text-2xl shadow-sm border border-blue-200">
              {employee.full_name.charAt(0)}
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{employee.full_name}</h4>
              <p className="text-gray-500 text-sm">{employee.designation}</p>
              <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {employee.status}
              </span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Employee ID</span><span className="text-gray-900 font-semibold">EMP{String(employee.employee_id).padStart(3, '0')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Email</span><span className="text-gray-900">{employee.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Phone</span><span className="text-gray-900">{employee.phone || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Department</span><span className="text-gray-900">{employee.department_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Company Role</span><span className="text-gray-900">{employee.role_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Salary</span><span className="text-gray-900">₹{(Number(employee.salary) || 0).toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 font-medium">Joining Date</span><span className="text-gray-900">{employee.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</span></div>
          </div>

          {user?.role_name === 'Admin' && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Account</h4>
              <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Temporary Password</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {hasPassword ? 'Reset the employee account password.' : 'Generate the first temporary password.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCopyPassword}
                    disabled={!temporaryPassword}
                    className="px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Copy Password
                  </button>
                  <PrimaryButton
                    type="button"
                    onClick={() => onPasswordAction(employee)}
                    disabled={isPasswordActionLoading}
                    className="shadow-blue-200"
                  >
                    {isPasswordActionLoading ? 'Working...' : (hasPassword ? 'Reset Password' : 'Generate Password')}
                  </PrimaryButton>
                </div>
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  value={displayedPassword}
                  readOnly
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-mono text-gray-900 focus:outline-none"
                />
              </div>
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Assigned Projects</h4>
            {employee.assigned_projects && employee.assigned_projects.length > 0 ? (
              <ul className="space-y-2">
                {employee.assigned_projects.map(p => {
                  const formatDt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : null;
                  const start = formatDt(p.start_date);
                  const end = p.end_date ? formatDt(p.end_date) : 'Ongoing';
                  
                  return (
                    <li key={p.project_name} className="flex flex-col gap-1 pb-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {p.project_name}
                      </div>
                      {start && (
                        <div className="text-xs text-gray-500 pl-3.5">
                          {start} &rarr; {end}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic">No Projects Assigned</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PasswordResetConfirmDialog = ({ employee, onCancel, onConfirm }) => {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm overflow-y-auto" onClick={onCancel}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95" onClick={(event) => event.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Reset Employee Password?</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            This will invalidate the current temporary password. The employee will need to use the newly generated password.
          </p>
          <div className="flex gap-3 justify-end">
            <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
            <PrimaryButton type="button" onClick={() => onConfirm(employee)} className="shadow-blue-200">
              Generate New Password
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Employee Modal ────────────────────────────────────────────────────
const EditModal = ({ employee, departments, roles, onClose, onSave }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      full_name: employee?.full_name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      department_id: employee?.department_id || '',
      role_id: employee?.role_id || '',
      joining_date: employee?.joining_date ? employee.joining_date.split('T')[0] : '',
      status: employee?.status || 'Active',
      salary: employee?.salary || 0,
    }
  });

  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Edit Employee</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-6 overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input type="text" {...register('full_name', { required: 'Name is required' })}
                className={`w-full px-4 py-2.5 bg-gray-50 border ${errors.full_name ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none`} />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input type="email" {...register('email', { required: 'Email is required' })}
                className={`w-full px-4 py-2.5 bg-gray-50 border ${errors.email ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none`} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input type="text" {...register('phone')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
              <select {...register('department_id')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">Select Department</option>
                {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Role</label>
              <select {...register('role_id')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">Select Role</option>
                {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Salary (₹)</label>
              <input type="number" {...register('salary')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Joining Date</label>
              <input type="date" {...register('joining_date')}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select {...register('status')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" icon={<Save className="w-4 h-4" />} className="shadow-blue-200">
              Save Changes
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Salary Update Modal ────────────────────────────────────────────────────
const SalaryModal = ({ employee, onClose, onSave }) => {
  const { register, watch, handleSubmit } = useForm({
    defaultValues: {
      basic: employee?.salary ? Math.round(Number(employee.salary) * 0.7) : 0,
      bonus: employee?.salary ? Math.round(Number(employee.salary) * 0.1) : 0,
      allowance: employee?.salary ? Math.round(Number(employee.salary) * 0.2) : 0,
      deduction: 0,
    }
  });

  const basic = Number(watch('basic')) || 0;
  const bonus = Number(watch('bonus')) || 0;
  const allowance = Number(watch('allowance')) || 0;
  const deduction = Number(watch('deduction')) || 0;
  const netSalary = basic + bonus + allowance - deduction;

  const onSubmit = () => { onSave(netSalary); };

  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Update Salary</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Basic Salary</label>
              <input type="number" {...register('basic')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bonus</label>
              <input type="number" {...register('bonus')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Allowance</label>
              <input type="number" {...register('allowance')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Deduction</label>
              <input type="number" {...register('deduction')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="pt-4 border-t border-gray-100">
              <label className="block text-sm font-bold text-gray-900 mb-1.5">Net Salary</label>
              <input type="number" value={netSalary} readOnly className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 font-bold focus:outline-none cursor-not-allowed" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" icon={<Save className="w-4 h-4" />} className="shadow-blue-200">
              Save Changes
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Password Result Modal ────────────────────────────────────────────────
const PasswordDialog = ({ title, temporaryPassword, onCopy, onClose }) => {
  if (!temporaryPassword) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Temporary Password</p>
            <input
              type="text"
              value={maskPassword(temporaryPassword)}
              readOnly
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-gray-900 focus:outline-none"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <SecondaryButton type="button" onClick={onCopy}>Copy Password</SecondaryButton>
            <PrimaryButton type="button" onClick={onClose} className="shadow-blue-200">Close</PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

const Employees = () => {
  const { user, hasPermission } = usePermission();
  const canManageEmployees = user?.role_name === 'Admin';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editSalaryEmployee, setEditSalaryEmployee] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [passwordDialog, setPasswordDialog] = useState(null);
  const [resetConfirmEmployee, setResetConfirmEmployee] = useState(null);
  const [isPasswordActionLoading, setIsPasswordActionLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const hasOpenModal = Boolean(
      isAddModalOpen ||
      isDeleteModalOpen ||
      viewEmployee ||
      editEmployee ||
      editSalaryEmployee ||
      passwordDialog ||
      resetConfirmEmployee
    );

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (passwordDialog) {
        setPasswordDialog(null);
        return;
      }

      if (resetConfirmEmployee) {
        setResetConfirmEmployee(null);
        return;
      }

      if (viewEmployee) {
        setViewEmployee(null);
        setTemporaryPassword('');
      }
    };

    document.body.style.overflow = hasOpenModal ? 'hidden' : '';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddModalOpen, isDeleteModalOpen, viewEmployee, editEmployee, editSalaryEmployee, passwordDialog, resetConfirmEmployee]);

  const handleGenerateTemporaryPassword = () => {
    setTemporaryPassword(generateTemporaryPassword());
  };

  const handleCopyPassword = async () => {
    const passwordToCopy = passwordDialog?.temporaryPassword || temporaryPassword;
    if (!passwordToCopy) return;

    try {
      await navigator.clipboard.writeText(passwordToCopy);
      toast.success('Password copied successfully.');
    } catch (error) {
      toast.error('Failed to copy password');
    }
  };

  // ── Load all data from PostgreSQL ──────────────────────────────────────────
  const loadEmployees = async () => {
    try {
      const res = await authFetch(`${API}/employees`);
      const data = await res.json();
      if (data.success) {
        const fresh = data.data;
        setEmployees(fresh);
        // Keep the ViewModal in sync: if it's open, replace the stale snapshot
        // with the matching employee from the freshly-loaded list.
        setViewEmployee(prev =>
          prev ? (fresh.find(e => e.employee_id === prev.employee_id) ?? prev) : null
        );
      } else {
        console.error('loadEmployees: API returned success=false', data);
      }
    } catch (err) {
      console.error('loadEmployees error:', err);
      toast.error('Failed to load employees');
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const [empRes, deptRes, roleRes, projRes] = await Promise.all([
          authFetch(`${API}/employees`),
          authFetch(`${API}/departments`),
          authFetch(`${API}/roles`),
          authFetch(`${API}/projects`),
        ]);
        const [empData, deptData, roleData, projData] = await Promise.all([
          empRes.json(), deptRes.json(), roleRes.json(), projRes.json()
        ]);
        if (empData.success) setEmployees(empData.data);
        if (deptData.success) setDepartments(deptData.data);
        if (roleData.success) setRoles(roleData.data);
        if (projData.success) setProjects(projData.data);
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };
    loadAll();

    // Listen for chatbot updates
    const handleChatbotUpdate = (e) => {
      loadEmployees();
    };
    window.addEventListener('chatbot_action_success', handleChatbotUpdate);
    
    return () => window.removeEventListener('chatbot_action_success', handleChatbotUpdate);
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const id = `EMP${String(emp.employee_id).padStart(3, '0')}`;
      const matchSearch = emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = filterDept ? emp.department_name === filterDept : true;
      const matchStatus = filterStatus ? emp.status === filterStatus : true;
      const matchProject = filterProject ? (emp.assigned_projects || []).some(p => p.project_name === filterProject) : true;
      return matchSearch && matchDept && matchStatus && matchProject;
    });
  }, [employees, searchTerm, filterDept, filterStatus, filterProject]);

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterDept, filterStatus, filterProject]);

  const handleResetFilters = () => {
    setSearchTerm(''); setFilterDept(''); setFilterStatus(''); setFilterProject('');
  };

  // ── Add Employee ───────────────────────────────────────────────────────────
  const handleAddSubmit = async (data) => {
    try {
      if (!temporaryPassword) {
        toast.error('Generate a temporary password before saving.');
        return;
      }

      const parsedRoleId = data.role_id ? parseInt(data.role_id, 10) : null;
      const parsedDepartmentId = data.department_id ? parseInt(data.department_id, 10) : null;

      const res = await authFetch(`${API}/employees`, {
        method: 'POST',
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          designation: data.designation || null,
          department_id: parsedDepartmentId,
          role_id: parsedRoleId,
          joining_date: data.joining_date || null,
          status: data.status || 'Active',
          salary: data.salary || null,
          temporary_password: temporaryPassword,
        }),
      });
      const result = await res.json();
      if (result.success) {
        await loadEmployees();
        setIsAddModalOpen(false);
        reset();
        setTemporaryPassword(result.temporaryPassword || temporaryPassword);
        setPasswordDialog({
          title: 'Employee Created Successfully',
          temporaryPassword: result.temporaryPassword || temporaryPassword,
        });
        toast.success('Employee added successfully!');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('handleAddSubmit error:', err);
      toast.error('Failed to add employee');
    }
  };

  const handlePasswordAction = async (employee) => {
    if (employee.has_password) {
      setResetConfirmEmployee(employee);
      return;
    }

    try {
      setIsPasswordActionLoading(true);
      const res = await authFetch(`${API}/employees/${employee.employee_id}/password`, {
        method: 'POST',
      });
      const result = await res.json();

      if (result.success) {
        await loadEmployees();
        setPasswordDialog({
          title: employee.has_password ? 'Password Reset Successfully' : 'Password Generated Successfully',
          temporaryPassword: result.temporaryPassword,
        });
      } else {
        toast.error(result.message || 'Failed to generate password');
      }
    } catch (error) {
      console.error('handlePasswordAction error:', error);
      toast.error('Failed to generate password');
    } finally {
      setIsPasswordActionLoading(false);
    }
  };

  const handleConfirmGeneratePassword = async (employee) => {
    setResetConfirmEmployee(null);

    try {
      setIsPasswordActionLoading(true);
      const res = await authFetch(`${API}/employees/${employee.employee_id}/password`, {
        method: 'POST',
      });
      const result = await res.json();

      if (result.success) {
        await loadEmployees();
        setTemporaryPassword(result.temporaryPassword || '');
        setPasswordDialog({
          title: 'Password Reset Successfully',
          temporaryPassword: result.temporaryPassword,
        });
      } else {
        toast.error(result.message || 'Failed to generate password');
      }
    } catch (error) {
      console.error('handleConfirmGeneratePassword error:', error);
      toast.error('Failed to generate password');
    } finally {
      setIsPasswordActionLoading(false);
    }
  };

  const handleClosePasswordDialog = () => {
    setPasswordDialog(null);

    if (!viewEmployee) {
      setTemporaryPassword('');
    }
  };

  const handleCloseViewEmployee = () => {
    setViewEmployee(null);
    setTemporaryPassword('');
    setPasswordDialog(null);
    setResetConfirmEmployee(null);
  };

  // ── Edit Employee ──────────────────────────────────────────────────────────
  const handleEditSave = async (data) => {
    try {
      // Parse FK IDs as integers (the <select> always returns strings).
      // '' || null would silently wipe the FK in PostgreSQL — parseInt prevents this.
      const parsedRoleId = data.role_id ? parseInt(data.role_id, 10) : null;
      const parsedDepartmentId = data.department_id ? parseInt(data.department_id, 10) : null;

      const res = await authFetch(`${API}/employees/${editEmployee.employee_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          department_id: parsedDepartmentId,
          role_id: parsedRoleId,
          joining_date: data.joining_date || null,
          status: data.status || 'Active',
          salary: data.salary || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        // Close the edit modal FIRST, then reload so the table re-renders
        // with fresh data from PostgreSQL (including the JOIN'd role_name).
        setEditEmployee(null);
        await loadEmployees();
        toast.success(`${data.full_name} updated successfully!`);
      } else {
        toast.error(result.message || 'Update failed');
      }
    } catch (err) {
      console.error('handleEditSave error:', err);
      toast.error('Failed to update employee');
    }
  };

  // ── Salary Update ──────────────────────────────────────────────────────────
  const handleSalarySave = async (newSalary) => {
    try {
      const res = await authFetch(`${API}/employees/${editSalaryEmployee.employee_id}/salary`, {
        method: 'PATCH',
        body: JSON.stringify({ salary: newSalary }),
      });
      const result = await res.json();
      if (result.success) {
        await loadEmployees();
        setEditSalaryEmployee(null);
        toast.success(`Salary updated successfully!`);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to update salary');
    }
  };

  // ── Delete Employee ────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    try {
      const res = await authFetch(`${API}/employees/${employeeToDelete.employee_id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        await loadEmployees();
        setIsDeleteModalOpen(false);
        setEmployeeToDelete(null);
        toast.success('Employee deleted successfully!');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to delete employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Total {filteredEmployees.length} employees
          </p>
        </div>
        {canManageEmployees && (
          <PrimaryButton
            onClick={() => {
              setTemporaryPassword('');
              setIsAddModalOpen(true);
            }}
            icon={<Plus className="w-5 h-5" />}
            className="shadow-blue-200 active:scale-[0.98]"
          >
            <span>Add Employee</span>
          </PrimaryButton>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-3">
          <select
            value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-[140px]"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.department_id} value={d.department_name}>{d.department_name}</option>)}
          </select>
          <select
            value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-[140px]"
          >
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.project_id} value={p.project_name}>{p.project_name}</option>)}
          </select>
          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-[120px]"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading employees...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No employees found</h3>
            <p className="text-gray-500 max-w-sm">We couldn't find any employees matching your current filters. Try adjusting your search criteria.</p>
            <button onClick={handleResetFilters} className="mt-4 text-blue-600 font-medium hover:underline">Clear all filters</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department/Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Salary</th>
                  {canManageEmployees && (
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedEmployees.map((emp) => (
                  <tr key={emp.employee_id} onClick={() => { setTemporaryPassword(''); setViewEmployee(emp); }} className="hover:bg-gray-50/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-100 to-blue-50 flex items-center justify-center font-bold text-blue-700 shadow-sm border border-blue-200">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{emp.full_name}</p>
                          <p className="text-xs text-gray-500">EMP{String(emp.employee_id).padStart(3, '0')} &bull; {emp.role_name || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700">{emp.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{emp.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 font-medium">{emp.department_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{emp.role_name || ''}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">₹{(Number(emp.salary) || 0).toLocaleString('en-IN')}</span>
                        {canManageEmployees && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditSalaryEmployee(emp); }}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Update Salary"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    {canManageEmployees && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditEmployee(emp); }}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(emp); setIsDeleteModalOpen(true); }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filteredEmployees.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 mt-auto">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</span> of <span className="font-medium text-gray-900">{filteredEmployees.length}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Add New Employee</h3>
              <button onClick={() => { setIsAddModalOpen(false); reset(); setTemporaryPassword(''); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(handleAddSubmit)} className="p-6 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" {...register('full_name', { required: true })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input type="email" {...register('email', { required: true })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="john@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <input type="text" {...register('phone')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="+1 234 567 8900" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Temporary Password</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={temporaryPassword}
                      readOnly
                      placeholder="Click Generate Password"
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none cursor-not-allowed font-mono text-gray-900"
                    />
                    <PrimaryButton
                      type="button"
                      onClick={handleGenerateTemporaryPassword}
                      className="shadow-blue-200 whitespace-nowrap"
                    >
                      Generate Password
                    </PrimaryButton>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation</label>
                  <input type="text" {...register('designation')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Frontend Developer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <select {...register('department_id')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  <select {...register('role_id')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">Select Role</option>
                    {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Salary (₹)</label>
                  <input type="number" {...register('salary')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="50000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Joining Date</label>
                  <input type="date" {...register('joining_date', { required: true })} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select {...register('status')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <SecondaryButton type="button" onClick={() => { setIsAddModalOpen(false); reset(); setTemporaryPassword(''); }}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" className="shadow-blue-200">Save Employee</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Employee?</h3>
            <p className="text-gray-500 mb-6">
              Are you sure you want to delete <span className="font-bold text-gray-900">{employeeToDelete?.full_name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 w-full">
              <SecondaryButton
                onClick={() => { setIsDeleteModalOpen(false); setEmployeeToDelete(null); }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </SecondaryButton>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl shadow-sm shadow-red-200 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View & Edit Modals */}
      <ViewModal
        employee={viewEmployee}
        temporaryPassword={temporaryPassword}
        onClose={handleCloseViewEmployee}
        onCopyPassword={handleCopyPassword}
        onPasswordAction={handlePasswordAction}
        isPasswordActionLoading={isPasswordActionLoading}
      />
      {passwordDialog && (
        <PasswordDialog
          title={passwordDialog.title}
          temporaryPassword={passwordDialog.temporaryPassword}
          onCopy={handleCopyPassword}
          onClose={handleClosePasswordDialog}
        />
      )}
      {resetConfirmEmployee && (
        <PasswordResetConfirmDialog
          employee={resetConfirmEmployee}
          onCancel={() => setResetConfirmEmployee(null)}
          onConfirm={handleConfirmGeneratePassword}
        />
      )}
      {editEmployee && (
        <EditModal
          employee={editEmployee}
          departments={departments}
          roles={roles}
          onClose={() => setEditEmployee(null)}
          onSave={handleEditSave}
        />
      )}
      {editSalaryEmployee && (
        <SalaryModal
          employee={editSalaryEmployee}
          onClose={() => setEditSalaryEmployee(null)}
          onSave={handleSalarySave}
        />
      )}
    </div>
  );
};

export default Employees;
