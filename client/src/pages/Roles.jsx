import { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Edit2, Trash2, Eye, AlertTriangle, X, Save,
  ShieldCheck, Users, CheckSquare, Square
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usePermission } from '../context/PermissionContext';
import PermissionGate from '../components/PermissionGate';
import PrimaryButton from '../components/common/PrimaryButton';
import SecondaryButton from '../components/common/SecondaryButton';

const API = import.meta.env.VITE_API_URL;



// ─── Permission Checkbox Grid ─────────────────────────────────────────────
const PermissionsGrid = ({ selected, onChange, availablePermissions = [] }) => (
  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
    {availablePermissions.map(perm => {
      const checked = selected.includes(perm);
      return (
        <button
          key={perm}
          type="button"
          onClick={() => onChange(checked ? selected.filter(p => p !== perm) : [...selected, perm])}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
            checked ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
          }`}
        >
          {checked ? <CheckSquare className="w-4 h-4 shrink-0" /> : <Square className="w-4 h-4 shrink-0 text-gray-400" />}
          <span>{perm}</span>
        </button>
      );
    })}
  </div>
);

// ─── View Role Modal ──────────────────────────────────────────────────────
const ViewModal = ({ role, onClose }) => {
  if (!role) return null;
  const perms = role.permissions ? (Array.isArray(role.permissions) ? role.permissions : JSON.parse(role.permissions || '[]')) : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">Role Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">{role.role_name}</h4>
              <p className="text-sm text-gray-500">{role.description}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500 font-medium">Status</span>
              <p className={`mt-0.5 font-semibold ${role.status === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>{role.status || 'Active'}</p>
            </div>
            <div><span className="text-gray-500 font-medium">Employees Assigned</span>
              <p className="mt-0.5 font-semibold text-gray-900">{role.employee_count || 0}</p>
            </div>
            <div><span className="text-gray-500 font-medium">Created</span>
              <p className="mt-0.5 text-gray-700">{role.created_at ? new Date(role.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Permissions ({perms.length})</p>
            <div className="flex flex-wrap gap-2">
              {perms.map(p => (
                <span key={p} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">{p}</span>
              ))}
              {perms.length === 0 && <span className="text-sm text-gray-400">No permissions set</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Add Role Modal ───────────────────────────────────────────────────────
const AddModal = ({ onClose, onSave, availablePermissions }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { status: 'Active' } });
  const [selectedPerms, setSelectedPerms] = useState([]);

  const onSubmit = (data) => {
    if (selectedPerms.length === 0) { toast.error('Select at least one permission.'); return; }
    onSave({ ...data, permissions: selectedPerms });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h3 className="text-xl font-bold text-gray-900">Add New Role</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Name <span className="text-red-500">*</span></label>
              <input type="text" {...register('role_name', { required: 'Role name is required' })}
                className={`w-full px-4 py-2.5 bg-gray-50 border ${errors.role_name ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none`}
                placeholder="e.g. Team Lead" />
              {errors.role_name && <p className="text-red-500 text-xs mt-1">{errors.role_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea {...register('description')} rows={2}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="Brief description of this role..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select {...register('status')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions <span className="text-gray-400 font-normal">({selectedPerms.length} selected)</span></label>
              <PermissionsGrid selected={selectedPerms} onChange={setSelectedPerms} availablePermissions={availablePermissions} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" icon={<Save className="w-4 h-4" />}>
              Save Role
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Edit Role Modal ──────────────────────────────────────────────────────
const EditModal = ({ role, onClose, onSave, availablePermissions }) => {
  const perms = role?.permissions ? (Array.isArray(role.permissions) ? role.permissions : JSON.parse(role.permissions || '[]')) : [];
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { role_name: role?.role_name || '', description: role?.description || '', status: role?.status || 'Active' }
  });
  const [selectedPerms, setSelectedPerms] = useState(perms);

  const onSubmit = (data) => {
    if (selectedPerms.length === 0) { toast.error('Select at least one permission.'); return; }
    onSave({ ...role, ...data, permissions: selectedPerms });
  };

  if (!role) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h3 className="text-xl font-bold text-gray-900">Edit Role</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Name <span className="text-red-500">*</span></label>
              <input type="text" {...register('role_name', { required: 'Role name is required' })}
                className={`w-full px-4 py-2.5 bg-gray-50 border ${errors.role_name ? 'border-red-400' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none`} />
              {errors.role_name && <p className="text-red-500 text-xs mt-1">{errors.role_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea {...register('description')} rows={2}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select {...register('status')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions <span className="text-gray-400 font-normal">({selectedPerms.length} selected)</span></label>
              <PermissionsGrid selected={selectedPerms} onChange={setSelectedPerms} availablePermissions={availablePermissions} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" icon={<Save className="w-4 h-4" />}>
              Save Changes
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Delete Dialog ────────────────────────────────────────────────────────
const DeleteDialog = ({ role, onClose, onConfirm }) => {
  if (!role) return null;
  const isAdmin = role.role_name === 'Admin';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center">
        <div className={`w-16 h-16 ${isAdmin ? 'bg-amber-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <AlertTriangle className={`w-8 h-8 ${isAdmin ? 'text-amber-600' : 'text-red-600'}`} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{isAdmin ? 'Cannot Delete Admin Role' : 'Delete Role?'}</h3>
        <p className="text-gray-500 mb-6">
          {isAdmin
            ? 'The Admin role is protected and cannot be deleted to preserve system integrity.'
            : <>Are you sure you want to delete <span className="font-bold text-gray-900">{role.role_name}</span>? This action cannot be undone.</>
          }
        </p>
        <div className="flex gap-3">
          <SecondaryButton onClick={onClose} className="flex-1 py-3 hover:bg-gray-100">
            {isAdmin ? 'Close' : 'Cancel'}
          </SecondaryButton>
          {!isAdmin && (
            <button onClick={() => onConfirm(role)} className="flex-1 px-4 py-3 bg-red-600 text-white font-medium hover:bg-red-700 rounded-xl shadow-sm transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Roles Page ──────────────────────────────────────────────────────
const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [viewRole, setViewRole] = useState(null);
  const [editRole, setEditRole] = useState(null);
  const [deleteRole, setDeleteRole] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loadPermissions = async () => {
    try {
      const res = await fetch(`${API}/roles/available-permissions`);
      const data = await res.json();
      if (data.success) setAvailablePermissions(data.data);
    } catch (err) {
      console.error('Failed to load permissions');
    }
  };

  const loadRoles = async () => {
    try {
      const res = await fetch(`${API}/roles`);
      const data = await res.json();
      if (data.success) setRoles(data.data);
    } catch (err) {
      toast.error('Failed to load roles');
    }
  };

  useEffect(() => {
        const init = async () => {
      setIsLoading(true);
      await Promise.all([loadRoles(), loadPermissions()]);
      setIsLoading(false);
    };
    init();

    // Listen for chatbot updates
    const handleChatbotUpdate = (e) => {
      loadRoles();
    };
    window.addEventListener('chatbot_action_success', handleChatbotUpdate);
    
    return () => window.removeEventListener('chatbot_action_success', handleChatbotUpdate);
  }, []);

  const filtered = useMemo(() =>
    roles.filter(r =>
      r.role_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [roles, searchTerm]);

  const handleAdd = async (data) => {
    try {
      const res = await fetch(`${API}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: data.role_name,
          description: data.description,
          status: data.status,
          permissions: JSON.stringify(data.permissions),
        }),
      });
      const result = await res.json();
      if (result.success) {
        await loadRoles();
        setIsAddOpen(false);
        toast.success(`Role "${data.role_name}" created successfully!`);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to create role');
    }
  };

  const handleEdit = async (data) => {
    try {
      const res = await fetch(`${API}/roles/${editRole.role_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: data.role_name,
          description: data.description,
          status: data.status,
          permissions: JSON.stringify(data.permissions),
        }),
      });
      const result = await res.json();
      if (result.success) {
        await loadRoles();
        setEditRole(null);
        toast.success(`Role "${data.role_name}" updated successfully!`);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const handleDelete = async (role) => {
    try {
      const res = await fetch(`${API}/roles/${role.role_id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        await loadRoles();
        setDeleteRole(null);
        toast.success(`Role "${role.role_name}" deleted successfully!`);
      } else {
        setDeleteRole(null);
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Roles</h2>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Total {filtered.length} roles
          </p>
        </div>
        <PermissionGate requires="Manage Roles">
          <PrimaryButton
            onClick={() => setIsAddOpen(true)}
            icon={<Plus className="w-5 h-5" />}
            className="shadow-blue-200 active:scale-[0.98]"
          >
            <span>Add Role</span>
          </PrimaryButton>
        </PermissionGate>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No roles found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Employees</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Permissions</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(role => {
                  const perms = role.permissions
                    ? (Array.isArray(role.permissions) ? role.permissions : JSON.parse(role.permissions || '[]'))
                    : [];
                  return (
                    <tr key={role.role_id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{role.role_name}</p>
                            <p className="text-xs text-gray-500 max-w-xs truncate">{role.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-gray-400" />
                          {role.employee_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {perms.slice(0, 2).map(p => (
                            <span key={p} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">{p}</span>
                          ))}
                          {perms.length > 2 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">+{perms.length - 2} more</span>
                          )}
                          {perms.length === 0 && <span className="text-xs text-gray-400">None set</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          (role.status || 'Active') === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${(role.status || 'Active') === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          {role.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{role.created_at ? new Date(role.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewRole(role)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <PermissionGate requires="Manage Roles">
                            <>
                              <button onClick={() => setEditRole(role)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Edit">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteRole(role)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ViewModal role={viewRole} onClose={() => setViewRole(null)} />
      {isAddOpen && <AddModal onClose={() => setIsAddOpen(false)} onSave={handleAdd} availablePermissions={availablePermissions} />}
      {editRole && <EditModal role={editRole} onClose={() => setEditRole(null)} onSave={handleEdit} availablePermissions={availablePermissions} />}
      <DeleteDialog role={deleteRole} onClose={() => setDeleteRole(null)} onConfirm={handleDelete} />
    </div>
  );
};

export default Roles;
