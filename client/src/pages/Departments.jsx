import { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Edit2, Trash2, Building2, Users, AlertTriangle, X, Save
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import authFetch from '../utils/authFetch';
import { usePermission } from '../context/PermissionContext';
import PermissionGate from '../components/PermissionGate';
import PrimaryButton from '../components/common/PrimaryButton';
import SecondaryButton from '../components/common/SecondaryButton';

const DUMMY_DEPARTMENTS = [
  { id: 'DPT01', name: 'Software Development', code: 'IT-DEV', head: 'John Smith', count: 45, description: 'Develops and maintains software applications.' },
  { id: 'DPT02', name: 'Human Resources', code: 'HR', head: 'Jane Doe', count: 12, description: 'Handles employee relations, payroll, and benefits.' },
  { id: 'DPT03', name: 'Marketing', code: 'MKT', head: 'Alice Johnson', count: 28, description: 'Handles advertising and brand management.' },
  { id: 'DPT04', name: 'Sales', code: 'SLS', head: 'Robert Brown', count: 39, description: 'Responsible for revenue generation.' }
];

const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [editDept, setEditDept] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoading(true);

        const response = await authFetch("/api/departments");
        const data = await response.json();

        if (data.success) {
          setDepartments(data.data);
        }

      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDepartments();

    // Listen for chatbot updates
    const handleChatbotUpdate = (e) => {
      fetchDepartments();
    };
    window.addEventListener('chatbot_action_success', handleChatbotUpdate);
    
    return () => window.removeEventListener('chatbot_action_success', handleChatbotUpdate);
  }, []);

  const filtered = useMemo(() => {
    return departments.filter(d =>
      d.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.department_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.head_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [departments, searchTerm]);

  const handleAddSubmit = async (data) => {
    try {
      const response = await authFetch(
        "/api/departments",
        {
          method: "POST",
          body: JSON.stringify({
            department_name: data.name,
            department_code: data.code,
            department_head: data.head,
            description: data.description
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setDepartments(prev => [...prev, {
          ...result.data,
          count: 0
        }]);

        toast.success("Department added successfully!");

        setIsAddModalOpen(false);
        reset();
      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to add department.");
    }
  };

  const handleDeleteConfirm = async () => {
    try {

      const response = await authFetch(
        `/api/departments/${deptToDelete.department_id}`,
        {
          method: "DELETE"
        }
      );

      const result = await response.json();

      if (result.success) {

        setDepartments(prev =>
          prev.filter(
            dept => dept.department_id !== deptToDelete.department_id
          )
        );

        setIsDeleteModalOpen(false);
        setDeptToDelete(null);

        toast.success("Department deleted successfully!");

      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to delete department.");
    }
  };

  const handleEditSave = async (data) => {
    try {
      const response = await authFetch(
        `/api/departments/${editDept.department_id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            department_name: data.name,
            department_code: data.code,
            department_head: data.head,
            description: data.description
          })
        }
      );

      const result = await response.json();

      if (result.success) {

        setDepartments(prev =>
          prev.map(dept =>
            dept.department_id === editDept.department_id
              ? {
                ...dept,
                ...result.data,
                count: dept.count
              }
              : dept
          )
        );

        toast.success("Department updated successfully!");
        setEditDept(null);

      } else {
        toast.error(result.message);
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to update department.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <span>Total {filtered.length} departments</span>
          </p>
        </div>
        <PermissionGate requires="Manage Departments">
          <PrimaryButton
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-5 h-5" />}
          >
            <span>Add Department</span>
          </PrimaryButton>
        </PermissionGate>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No departments found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Head</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Employees</th>
                  <PermissionGate requires="Manage Departments">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </PermissionGate>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((dept) => (
                  <tr key={dept.department_id} className="hover:bg-gray-50/50 group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">
                        {dept.department_name}
                      </p>
                      <p className="text-sm text-indigo-600 font-medium">{dept.department_code}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 hidden md:table-cell">
                      {dept.head_name || 'Not Assigned'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell max-w-xs truncate">
                      {dept.description}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        {dept.count}
                      </div>
                    </td>
                    <PermissionGate requires="Manage Departments">
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditDept(dept)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setDeptToDelete(dept); setIsDeleteModalOpen(true); }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </PermissionGate>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b flex justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Add Department</h3>
              <button onClick={() => { setIsAddModalOpen(false); reset(); }}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit(handleAddSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Department Name</label>
                <input type="text" {...register('name', { required: true })} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input type="text" {...register('code', { required: true })} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department Head</label>
                <input type="text" {...register('head', { required: true })} className="w-full px-4 py-2 border rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea {...register('description', { required: true })} className="w-full px-4 py-2 border rounded-xl"></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <SecondaryButton type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</SecondaryButton>
                <PrimaryButton type="submit">Save</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Delete Department</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete {deptToDelete?.department_name}?</p>
            <div className="flex gap-3">
              <SecondaryButton onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200">Cancel</SecondaryButton>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editDept && (
        <EditDeptModal dept={editDept} onClose={() => setEditDept(null)} onSave={handleEditSave} />
      )}
    </div>
  );
};

const EditDeptModal = ({ dept, onClose, onSave }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: dept?.department_name || '',
      code: dept?.department_code || '',
      head: dept?.head_name || '',
      description: dept?.description || '',
    }
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b flex justify-between bg-gray-50/50">
          <h3 className="font-bold text-gray-900 text-xl">Edit Department</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Department Name</label>
            <input type="text" {...register('name', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input type="text" {...register('code', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department Head</label>
            <input type="text" {...register('head', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea {...register('description', { required: true })} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
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

export default Departments;