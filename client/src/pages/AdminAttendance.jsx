import { useState, useEffect } from 'react';
import { Search, Filter, Clock, ChevronLeft, ChevronRight, Eye, Edit2, Play, Power, X, Users, UserCheck, UserX, PlayCircle, AlertCircle } from 'lucide-react';
import authFetch from '../utils/authFetch';
import toast from 'react-hot-toast';
import ExportReportModal from '../components/ExportReportModal';

const API = import.meta.env.VITE_API_URL;

const StatCard = ({ title, value, icon: Icon, color, onClick, isActive }) => (
  <div
    className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer ${isActive ? 'ring-2 ring-indigo-500' : ''}`}
    onClick={onClick}
  >
    <div className={`p-4 rounded-2xl ${color} text-white`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </div>
);

const ViewModal = ({ record, onClose }) => {
  if (!record) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-900">View Attendance</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-gray-500 font-medium text-sm">Employee Name</span><p className="font-semibold">{record.full_name}</p></div>
            <div><span className="text-gray-500 font-medium text-sm">Employee ID</span><p className="font-semibold">EMP{String(record.employee_id).padStart(3, '0')}</p></div>
            <div><span className="text-gray-500 font-medium text-sm">Department</span><p className="font-semibold">{record.department_name || 'N/A'}</p></div>
            <div><span className="text-gray-500 font-medium text-sm">Status</span><p className="font-semibold text-blue-600">{record.status}</p></div>
            <div><span className="text-gray-500 font-medium text-sm">Date</span><p className="font-semibold">{new Date(record.attendance_date).toLocaleDateString()}</p></div>
            <div>
              <span className="text-gray-500 font-medium text-sm">Working Hours</span>
              <p className="font-semibold">{record.working_minutes ? `${Math.floor(record.working_minutes / 60)}h ${Math.floor(record.working_minutes % 60)}m` : '--'}</p>
            </div>
            <div><span className="text-gray-500 font-medium text-sm">Check In</span><p className="font-semibold">{new Date(record.check_in_time).toLocaleTimeString()}</p></div>
            <div><span className="text-gray-500 font-medium text-sm">Check Out</span><p className="font-semibold">{record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '--'}</p></div>
            <div><span className="text-gray-500 font-medium text-sm">Created At</span><p className="font-semibold">{new Date(record.created_at).toLocaleString()}</p></div>
            <div><span className="text-gray-500 font-medium text-sm">Updated At</span><p className="font-semibold">{new Date(record.updated_at).toLocaleString()}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({ record, onClose, onSave }) => {
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  
  useEffect(() => {
    if (record) {
      // Format as YYYY-MM-DDTHH:mm
      const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      };
      setInTime(formatTime(record.check_in_time));
      setOutTime(formatTime(record.check_out_time));
    }
  }, [record]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inTime) return toast.error('Check In Time is required');
    if (outTime && new Date(inTime) > new Date(outTime)) {
      return toast.error('Check Out Time must be after Check In Time');
    }
    onSave(record.attendance_id, {
      check_in_time: new Date(inTime).toISOString(),
      check_out_time: outTime ? new Date(outTime).toISOString() : null
    });
  };

  if (!record) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Edit Attendance</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check In Time</label>
            <input type="datetime-local" className="w-full px-4 py-2 border rounded-xl" value={inTime} onChange={e => setInTime(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check Out Time</label>
            <input type="datetime-local" className="w-full px-4 py-2 border rounded-xl" value={outTime} onChange={e => setOutTime(e.target.value)} />
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

const ConfirmDialog = ({ message, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
      <h3 className="text-lg font-bold text-gray-900 mb-4">{message}</h3>
      <div className="flex justify-center gap-3">
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirm</button>
      </div>
    </div>
  </div>
);

const AdminAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('Today');
  const [statusFilter, setStatusFilter] = useState('All');
  const [summaryData, setSummaryData] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    currentlyWorking: 0,
    forgotCheckout: 0
  });
  const [activeCard, setActiveCard] = useState(null); // 'total'|'present'|'absent'|'working'|'forgot'
  const [exportOpen, setExportOpen] = useState(false);
  
  // Modals
  const [viewRecord, setViewRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'resume'|'force', id, message }
  
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regRequests, setRegRequests] = useState([]);
  const [viewRegRequest, setViewRegRequest] = useState(null);

  const fetchRegRequests = async () => {
    try {
      const res = await authFetch(`${API}/attendance/regularization/all`);
      const data = await res.json();
      if (data.success) setRegRequests(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegAction = async (id, action) => {
    try {
      const res = await authFetch(`${API}/attendance/regularization/${id}/${action}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Request ${action}d`);
        fetchRegRequests();
        fetchAttendance();
        fetchSummary();
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  useEffect(() => {
    if (regModalOpen) fetchRegRequests();
  }, [regModalOpen]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAttendance();
  }, [dateFilter, statusFilter]);

  const fetchSummary = async () => {
    try {
      const res = await authFetch(`${API}/attendance/summary`);
      const data = await res.json();
      if (data.success) {
        setSummaryData(data.data);
      }
    } catch (err) {
      console.error('Failed to load summary', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      fetchSummary();
      const res = await authFetch(`${API}/attendance/all?dateFilter=${dateFilter}&status=${statusFilter === 'All' ? '' : statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setAttendance(data.data);
      } else {
        toast.error('Failed to load attendance');
      }
    } catch (err) {
      toast.error('Server error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSave = async (id, payload) => {
    try {
      const res = await authFetch(`${API}/attendance/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Attendance updated successfully');
        setEditRecord(null);
        fetchAttendance();
      } else {
        toast.error(data.message || 'Update failed');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const handleExecuteAction = async () => {
    const { type, id } = confirmAction;
    setConfirmAction(null);
    try {
      const endpoint = type === 'resume' ? 'resume' : 'force-checkout';
      const res = await authFetch(`${API}/attendance/${id}/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Action completed successfully');
        fetchAttendance();
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  // Apply card filter to attendance data
  const applyCardFilter = (data) => {
    if (!activeCard) return data;
    switch (activeCard) {
      case 'total':
        return data; 
      case 'present':
        // Present means they have an attendance record (not Absent).
        // Using strict status check instead of attendance_id to ensure safety.
        return data.filter(rec => rec.status && rec.status !== 'Absent');
      case 'absent':
        // Absent means they don't have an attendance record for today.
        return data.filter(rec => rec.status === 'Absent');
      case 'working':
        return data.filter(rec => rec.status === 'Working');
      case 'forgot':
        return data.filter(rec => rec.status === 'Forgot Checkout');
      default:
        return data;
    }
  };

  const filteredAttendance = attendance.filter(record => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (record.full_name && record.full_name.toLowerCase().includes(term)) ||
      (record.department_name && record.department_name.toLowerCase().includes(term));
    return matchesSearch;
  });

  const cardFilteredAttendance = applyCardFilter(filteredAttendance);

  const totalPages = Math.ceil(cardFilteredAttendance.length / itemsPerPage);
  const currentAttendance = cardFilteredAttendance.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor employee attendance and working hours</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setRegModalOpen(true)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            Regularization Requests
          </button>
          <button onClick={() => setExportOpen(true)} className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
            Export Attendance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <StatCard
        title="Total Employees"
        value={summaryData.totalEmployees}
        icon={Users}
        color="bg-blue-500"
        onClick={() => setActiveCard(activeCard === 'total' ? null : 'total')}
        isActive={activeCard === 'total'}
      />
      <StatCard
        title="Present"
        value={summaryData.present}
        icon={UserCheck}
        color="bg-emerald-500"
        onClick={() => setActiveCard(activeCard === 'present' ? null : 'present')}
        isActive={activeCard === 'present'}
      />
      <StatCard
        title="Absent"
        value={summaryData.absent}
        icon={UserX}
        color="bg-red-500"
        onClick={() => setActiveCard(activeCard === 'absent' ? null : 'absent')}
        isActive={activeCard === 'absent'}
      />
      <StatCard
        title="Currently Working"
        value={summaryData.currentlyWorking}
        icon={PlayCircle}
        color="bg-indigo-500"
        onClick={() => setActiveCard(activeCard === 'working' ? null : 'working')}
        isActive={activeCard === 'working'}
      />
      <StatCard
        title="Forgot Checkout"
        value={summaryData.forgotCheckout}
        icon={AlertCircle}
        color="bg-orange-500"
        onClick={() => setActiveCard(activeCard === 'forgot' ? null : 'forgot')}
        isActive={activeCard === 'forgot'}
      />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by Employee or Department..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none appearance-none cursor-pointer" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
                <option value="All Time">All Time</option>
              </select>
            </div>
            <div className="relative">
              <select className="pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none appearance-none cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Working">Working</option>
                <option value="Completed">Completed</option>
                <option value="Forgot Checkout">Forgot Checkout</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Loading attendance...</div>
          ) : cardFilteredAttendance.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><Clock className="w-8 h-8 text-gray-400" /></div>
              <h3 className="text-lg font-bold text-gray-900">No matching attendance records.</h3>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Employee</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Check In</th>
                  <th className="p-4 font-semibold">Check Out</th>
                  <th className="p-4 font-semibold">Working Hours</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Approved By</th>
                  <th className="p-4 font-semibold">Approved On</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentAttendance.map((record) => {
                  const checkIn = new Date(record.check_in_time);
                  const checkOut = record.check_out_time ? new Date(record.check_out_time) : null;
                  const dateStr = checkIn.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
                  const inStr = checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const outStr = checkOut ? checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                  let hrs = '--';
                  if (record.working_minutes) {
                    const h = Math.floor(record.working_minutes / 60);
                    const m = Math.floor(record.working_minutes % 60);
                    hrs = `${h}h ${m}m`;
                  }
                  let statusColor = 'bg-gray-100 text-gray-700';
                  if (record.status === 'Working') statusColor = 'bg-blue-100 text-blue-700';
                  if (record.status === 'Completed') statusColor = 'bg-emerald-100 text-emerald-700';
                  if (record.status === 'Forgot Checkout') statusColor = 'bg-red-100 text-red-700';

                  return (
                    <tr key={record.attendance_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs">{record.full_name?.charAt(0)}</div>
                          <span className="font-semibold text-gray-900">{record.full_name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-900 font-medium">{dateStr}</td>
                      <td className="p-4 text-sm text-gray-600">{inStr}</td>
                      <td className="p-4 text-sm text-gray-600">{outStr}</td>
                      <td className="p-4 text-sm text-gray-900 font-medium">{hrs}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>{record.status}</span>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {record.regularization_approved_by_name || '-'}
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {record.regularization_approved_on ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(record.regularization_approved_on)) : '-'}
                      </td>
                      <td className="p-4 flex gap-2">
                        <button onClick={() => setViewRecord(record)} title="View" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setEditRecord(record)} title="Edit" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                        {record.status === 'Completed' && record.check_out_time && (
                          <button onClick={() => setConfirmAction({ type: 'resume', id: record.attendance_id, message: "Resume this employee's attendance?" })} title="Resume Work" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Play className="w-4 h-4" /></button>
                        )}
                        {record.status === 'Working' && (
                          <button onClick={() => setConfirmAction({ type: 'force', id: record.attendance_id, message: "Force Check Out for this employee?" })} title="Force Check Out" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Power className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && filteredAttendance.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-sm">
            <span className="text-gray-500 font-medium">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAttendance.length)} of {filteredAttendance.length}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
            </div>
          </div>
        )}
      </div>

      <ViewModal record={viewRecord} onClose={() => setViewRecord(null)} />
      <EditModal record={editRecord} onClose={() => setEditRecord(null)} onSave={handleEditSave} />
      {confirmAction && (
        <ConfirmDialog message={confirmAction.message} onConfirm={handleExecuteAction} onClose={() => setConfirmAction(null)} />
      )}
      <ExportReportModal open={exportOpen} onClose={() => setExportOpen(false)} isAttendanceOnly={true} />

      {/* Regularization Requests Modal */}
      {regModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setRegModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
              <h3 className="text-lg font-bold text-gray-900">Regularization Requests</h3>
              <button onClick={() => setRegModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {regRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No regularization requests found.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-3 text-sm font-medium text-gray-500">Employee</th>
                      <th className="py-2 px-3 text-sm font-medium text-gray-500">Date</th>
                      <th className="py-2 px-3 text-sm font-medium text-gray-500">Issue</th>
                      <th className="py-2 px-3 text-sm font-medium text-gray-500">Status</th>
                      <th className="py-2 px-3 text-sm font-medium text-gray-500">Requested In</th>
                      <th className="py-2 px-3 text-sm font-medium text-gray-500">Requested Out</th>
                      <th className="py-2 px-3 text-sm font-medium text-gray-500">Submitted On</th>
                      <th className="py-2 px-3 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regRequests.map(req => (
                      <tr key={req.regularization_id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 text-sm text-gray-900 font-medium">{req.full_name}</td>
                        <td className="py-3 px-3 text-sm text-gray-500">
                          {req.attendance_date ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(req.attendance_date)) : '—'}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-900">{req.issue_type}</td>
                        <td className="py-3 px-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-500">
                          {req.requested_check_in ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(req.requested_check_in)) : '—'}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-500">
                          {req.requested_check_out ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(req.requested_check_out)) : '—'}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-500">
                          {req.created_at ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(req.created_at)) : '—'}
                        </td>
                        <td className="py-3 px-3 text-sm text-center">
                          <button 
                            onClick={() => setViewRegRequest(req)} 
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg transition-colors font-medium text-xs ${
                              req.status === 'Pending' ? 'border-yellow-500 text-yellow-600 hover:bg-yellow-50' : 
                              req.status === 'Approved' ? 'border-green-500 text-green-600 hover:bg-green-50' : 
                              'border-red-500 text-red-600 hover:bg-red-50'
                            }`}
                            title={req.status === 'Pending' ? 'Review Request' : 'View Details'}
                          >
                            <Eye className="w-4 h-4" />
                            {req.status === 'Pending' ? 'Review' : 'Details'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Regularization Request Details Modal */}
      {viewRegRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setViewRegRequest(null)}>
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Request Details</h3>
              <button onClick={() => setViewRegRequest(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 font-medium text-sm">Employee Name</span>
                    <p className="font-semibold text-gray-900">{viewRegRequest.full_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium text-sm">Attendance Date</span>
                    <p className="font-semibold text-gray-900">{viewRegRequest.attendance_date ? new Date(viewRegRequest.attendance_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 font-medium text-sm">Issue</span>
                    <p className="font-semibold text-blue-600">{viewRegRequest.issue_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium text-sm">Submitted On</span>
                    <p className="font-semibold text-gray-900">{viewRegRequest.created_at ? new Date(viewRegRequest.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 font-medium text-sm">Requested Check In</span>
                    <p className="font-semibold text-gray-900">{viewRegRequest.requested_check_in ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(viewRegRequest.requested_check_in)) : '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium text-sm">Requested Check Out</span>
                    <p className="font-semibold text-gray-900">{viewRegRequest.requested_check_out ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(viewRegRequest.requested_check_out)) : '—'}</p>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 font-medium text-sm">Reason</span>
                  <div className="font-semibold text-gray-900 mt-1 p-3 bg-gray-50 rounded-xl whitespace-pre-wrap">{viewRegRequest.reason}</div>
                </div>
                {viewRegRequest.status !== 'Pending' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div>
                      <span className="text-gray-500 font-medium text-sm flex items-center gap-2">
                        Status
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${viewRegRequest.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {viewRegRequest.status}
                        </span>
                      </span>
                    </div>
                    {viewRegRequest.updated_at && (
                      <div>
                        <span className="text-gray-500 font-medium text-sm">Reviewed On</span>
                        <p className="font-semibold text-gray-900">{new Date(viewRegRequest.updated_at).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              {viewRegRequest.status === 'Pending' ? (
                <>
                  <button 
                    onClick={() => {
                      handleRegAction(viewRegRequest.regularization_id, 'reject');
                      setViewRegRequest(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-red-500 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    Reject
                  </button>
                  <button 
                    onClick={() => {
                      handleRegAction(viewRegRequest.regularization_id, 'approve');
                      setViewRegRequest(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <UserCheck className="w-5 h-5" />
                    Approve
                  </button>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button 
                    onClick={() => setViewRegRequest(null)} 
                    className="px-6 py-2.5 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;
