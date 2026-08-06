import { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, Edit2, Trash2, FolderKanban, Users, AlertTriangle, X, Save
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import authFetch from '../utils/authFetch';
import { usePermission } from '../context/PermissionContext';
import PermissionGate from '../components/PermissionGate';

const API = 'http://localhost:5000/api';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [editProject, setEditProject] = useState(null);
  const [assignProject, setAssignProject] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  const loadProjects = async () => {
    try {
      const res = await authFetch(`${API}/projects`);
      const data = await res.json();
      if (data.success) setProjects(data.data);
    } catch (err) {
      toast.error('Failed to load projects');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadProjects();
      setIsLoading(false);
    };
    init();

    // Listen for chatbot updates
    const handleChatbotUpdate = (e) => {
      loadProjects();
    };
    window.addEventListener('chatbot_action_success', handleChatbotUpdate);
    
    return () => window.removeEventListener('chatbot_action_success', handleChatbotUpdate);
  }, []);

  const filtered = useMemo(() => {
    return projects.filter(p =>
      (p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.project_code?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterStatus ? p.status === filterStatus : true)
    );
  }, [projects, searchTerm, filterStatus]);

  const handleAddSubmit = async (data) => {
    try {
      const res = await authFetch(`${API}/projects`, {
        method: 'POST',
        body: JSON.stringify({
          project_name: data.name,
          project_code: data.code,
          client_name: data.client,
          start_date: data.start,
          end_date: data.end,
          status: data.status,
        }),
      });
      const result = await res.json();
      if (result.success) {
        await loadProjects();
        setIsAddModalOpen(false);
        reset();
        toast.success('Project added successfully!');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to add project');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await authFetch(`${API}/projects/${projectToDelete.project_id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        await loadProjects();
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
        toast.success('Project deleted successfully!');
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const handleEditSave = async (data) => {
    try {
      const res = await authFetch(`${API}/projects/${editProject.project_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          project_name: data.name,
          project_code: data.code,
          client_name: data.client,
          start_date: data.start,
          end_date: data.end,
          status: data.status,
        }),
      });
      const result = await res.json();
      if (result.success) {
        await loadProjects();
        setEditProject(null);
        toast.success(`${data.name} updated successfully!`);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Failed to update project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            Total {filtered.length} projects
          </p>
        </div>
        <PermissionGate requires="Manage Projects">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Add Project</span>
          </button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <select
          value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 min-w-[140px]"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No projects found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Project Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Team</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <PermissionGate requires="Assign Employees">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Assign</th>
                  </PermissionGate>
                  <PermissionGate requires="Manage Projects">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </PermissionGate>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((proj) => (
                  <tr key={proj.project_id} className="hover:bg-gray-50/50 group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{proj.project_name}</p>
                      <p className="text-xs text-gray-500">{proj.project_code}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{proj.client_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {proj.start_date ? proj.start_date.split('T')[0] : 'N/A'} to {proj.end_date ? proj.end_date.split('T')[0] : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        {proj.members || 0} Assigned
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${proj.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        proj.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {proj.status}
                      </span>
                    </td>
                    <PermissionGate requires="Assign Employees">
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setAssignProject(proj)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Assign Employees
                        </button>
                      </td>
                    </PermissionGate>
                    <PermissionGate requires="Manage Projects">
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditProject(proj)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button
                            onClick={() => { setProjectToDelete(proj); setIsDeleteModalOpen(true); }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          ><Trash2 className="w-4 h-4" /></button>
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
        <AddProjectModal
          onClose={() => { setIsAddModalOpen(false); reset(); }}
          onSave={handleAddSubmit}
        />
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Delete Project</h3>
            <p className="text-gray-500 mb-6">Are you sure you want to delete {projectToDelete?.project_name}?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editProject && (
        <EditProjectModal project={editProject} onClose={() => setEditProject(null)} onSave={handleEditSave} />
      )}

      {/* Assign Employees Modal */}
      {assignProject && (
        <AssignEmployeesModal project={assignProject} onClose={() => { setAssignProject(null); loadProjects(); }} />
      )}
    </div>
  );
};

// ─── Add Project Modal ──────────────────────────────────────────────────
const AddProjectModal = ({ onClose, onSave }) => {
  const { register, handleSubmit } = useForm({ defaultValues: { status: 'Active' } });

  const handleFormSubmit = async (data) => {
    await onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b flex justify-between bg-gray-50/50 shrink-0">
          <h3 className="font-bold text-gray-900 text-xl">Add Project</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="add-project-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input type="text" {...register('name', { required: true })} className="w-full px-4 py-2 border rounded-xl bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input type="text" {...register('code', { required: true })} className="w-full px-4 py-2 border rounded-xl bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <input type="text" {...register('client', { required: true })} className="w-full px-4 py-2 border rounded-xl bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" {...register('start', { required: true })} className="w-full px-4 py-2 border rounded-xl bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input type="date" {...register('end', { required: true })} className="w-full px-4 py-2 border rounded-xl bg-gray-50" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Status</label>
                <select {...register('status', { required: true })} className="w-full px-4 py-2 border rounded-xl bg-gray-50">
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-5 py-2 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button form="add-project-form" type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl">Save</button>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Project Modal ──────────────────────────────────────────────────
const EditProjectModal = ({ project, onClose, onSave }) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: project?.project_name || '',
      code: project?.project_code || '',
      client: project?.client_name || '',
      start: project?.start_date ? project.start_date.split('T')[0] : '',
      end: project?.end_date ? project.end_date.split('T')[0] : '',
      status: project?.status || 'Active',
    }
  });

  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API}/assignments?project_id=${project.project_id}`);
        const data = await res.json();
        if (data.success) setAssignments(data.data);
      } catch (err) {
        // assignments table may return empty — that's OK
      }
    };
    load();
  }, [project.project_id]);

  const handleRemoveAssignment = async (assignmentId) => {
    if (window.confirm('Remove this employee from the project?')) {
      try {
        const res = await authFetch(`${API}/assignments/${assignmentId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setAssignments(prev => prev.filter(a => a.assignment_id !== assignmentId));
          toast.success('Employee removed from project');
        }
      } catch (err) {
        toast.error('Failed to remove assignment');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b flex justify-between bg-gray-50/50 shrink-0">
          <h3 className="font-bold text-gray-900 text-xl">Edit Project</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form id="edit-project-form" onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input type="text" {...register('name', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input type="text" {...register('code', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <input type="text" {...register('client', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" {...register('start', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input type="date" {...register('end', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Status</label>
                <select {...register('status', { required: true })} className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="mt-8 border-t pt-6">
              <h4 className="font-bold text-gray-900 mb-4">Assigned Employees</h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Employee</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Department / Role</th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Project Role</th>
                      <th className="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {assignments.map(a => (
                      <tr key={a.assignment_id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs">
                              {(a.full_name || '?').charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{a.full_name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">EMP{String(a.employee_id).padStart(3, '0')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{a.department_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{a.role_name || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.role_name || 'Member'}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => handleRemoveAssignment(a.assignment_id)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded hover:bg-red-50">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">No employees assigned to this project</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3 border-t bg-gray-50/50 shrink-0 mt-auto">
          <button type="button" onClick={onClose} className="px-5 py-2 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button type="submit" form="edit-project-form" className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Assign Employees Modal ────────────────────────────────────────────────
const AssignEmployeesModal = ({ project, onClose }) => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, deptRes, roleRes, asgRes] = await Promise.all([
          authFetch(`${API}/employees`), authFetch(`${API}/departments`), authFetch(`${API}/roles`),
          authFetch(`${API}/assignments?project_id=${project.project_id}`)
        ]);
        const [empData, deptData, roleData, asgData] = await Promise.all([
          empRes.json(), deptRes.json(), roleRes.json(), asgRes.json()
        ]);

        const assigned = asgData.success ? asgData.data.map(a => a.employee_id) : [];
setAssignedIds(assigned);
if (empData.success) setEmployees(empData.data);
if (deptData.success) setDepartments(deptData.data);
if (roleData.success) setRoles(roleData.data);
setSelectedEmployees(assigned);
      } catch (err) {
        toast.error('Failed to load employees');
      }
    };
    load();
  }, [project.project_id]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchSearch = emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase());
        String(emp.employee_id).includes(search) ||
        (emp.department_name || '').toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept ? emp.department_name === filterDept : true;
      const matchRole = filterRole ? emp.role_name === filterRole : true;
      const matchStatus = filterStatus ? emp.status === filterStatus : true;
      return matchSearch && matchDept && matchRole && matchStatus;
    });
  }, [employees, search, filterDept, filterRole, filterStatus]);

  const toggleSelect = (id) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (selectedEmployees.length === 0) return;
    try {
      const newIds = selectedEmployees.filter(id => !assignedIds.includes(id));
      for (const empId of newIds) {
        await authFetch(`${API}/assignments`, {
          method: 'POST',
          body: JSON.stringify({
            employee_id: empId,
            project_id: project.project_id,
            role: 'Member',
            assigned_date: new Date().toISOString().split('T')[0],
          }),
        });
      }
      toast.success(`Assigned ${newIds.length} employee(s) to ${project.project_name}`);
      onClose();
    } catch (err) {
      toast.error('Failed to assign employees');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b flex justify-between bg-gray-50/50 shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-xl">Assign Employees</h3>
            <p className="text-sm text-gray-500 mt-1">Project: <span className="font-bold text-gray-700">{project.project_name}</span></p>
          </div>
          <button onClick={onClose} className="self-start p-2"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-6 shrink-0 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search Employee by Name, ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.department_id} value={d.department_name}>{d.department_name}</option>)}
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Roles</option>
            {roles.map(r => <option key={r.role_id} value={r.role_name}>{r.role_name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden bg-white">
          {/* Fixed Header Block */}
          <div className="bg-white shadow-sm z-10 px-6 py-3 border-b border-gray-100">
            <div className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-4 px-4 items-center">
              <div></div>
              <div className="text-xs font-bold text-gray-500 uppercase">Employee</div>
              <div className="text-xs font-bold text-gray-500 uppercase">Department</div>
              <div className="text-xs font-bold text-gray-500 uppercase">Company Role</div>
              <div className="text-xs font-bold text-gray-500 uppercase">Status</div>
            </div>
          </div>

          {/* Scrollable Employee List */}
          <div className="overflow-y-auto p-6 pt-2 flex-1 max-h-[50vh]">
            <div className="flex flex-col space-y-1">
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.employee_id} 
                  className="grid grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-4 px-4 py-3 items-center hover:bg-gray-50/50 cursor-pointer rounded-xl transition-colors" 
                  onClick={() => toggleSelect(emp.employee_id)}
                >
                  <div>
                    <input type="checkbox" checked={selectedEmployees.includes(emp.employee_id)} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm shrink-0">
                      {emp.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{emp.full_name}</p>
                      <p className="text-xs text-gray-500">EMP{String(emp.employee_id).padStart(3, '0')}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 truncate">{emp.department_name || 'N/A'}</div>
                  <div className="text-sm text-gray-600 truncate">{emp.role_name || 'N/A'}</div>
                  <div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {emp.status}
                    </span>
                  </div>
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <div className="py-12 text-center text-gray-500">No employees match your search.</div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 flex justify-between items-center border-t bg-gray-50/50 shrink-0">
          <span className="text-sm text-gray-500 font-medium">
            {selectedEmployees.length} employee(s) selected
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 hover:bg-gray-100 rounded-xl font-medium text-gray-700">Cancel</button>
            <button
              onClick={handleAssign}
              disabled={selectedEmployees.length === 0}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-sm"
            >
              Assign Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;