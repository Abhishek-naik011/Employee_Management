// client/src/components/ExportReportModal.jsx

import { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import authFetch from '../utils/authFetch';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL;

const ADMIN_REPORT_TYPES = [
  'Overall Company Report',
  'Employees Report',
  'Departments Report',
  'Roles Report',
  'Projects Report',
  'Attendance Report'
];

const EMPLOYEE_REPORT_TYPES = [
  'My Profile Report',
  'My Attendance Report',
  'My Assigned Projects Report',
  'My Complete Employee Report'
];

const ExportReportModal = ({ open, onClose, isEmployee = false, isAttendanceOnly = false }) => {
  const currentReportTypes = isAttendanceOnly ? ['Attendance Report'] : (isEmployee ? EMPLOYEE_REPORT_TYPES : ADMIN_REPORT_TYPES);
  const [reportCategory, setReportCategory] = useState(isAttendanceOnly ? 'Attendance Report' : (isEmployee ? 'My Complete Employee Report' : 'Overall Company Report'));
  const [format, setFormat] = useState('pdf');
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic Options States
  const [scope, setScope] = useState('all');
  const [attendancePeriod, setAttendancePeriod] = useState('daily');
  const [date, setDate] = useState('');
  const [week, setWeek] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Data for Selects
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [projects, setProjects] = useState([]);

  const [selectedId, setSelectedId] = useState('');
  const [attendanceDeptScope, setAttendanceDeptScope] = useState('all');
  const [attendanceSelectedDept, setAttendanceSelectedDept] = useState('');

  // Fetch references on mount
  useEffect(() => {
    const fetchReferences = async () => {
      try {
        const [empRes, deptRes, roleRes, projRes] = await Promise.all([
          authFetch(`${API}/employees`),
          authFetch(`${API}/departments`),
          authFetch(`${API}/roles`),
          authFetch(`${API}/projects`)
        ]);
        if (empRes.ok) {
          const data = await empRes.json();
          setEmployees(data.data || []);
        }
        if (deptRes.ok) {
          const data = await deptRes.json();
          setDepartments(data.data || []);
        }
        if (roleRes.ok) {
          const data = await roleRes.json();
          setRoles(data.data || []);
        }
        if (projRes.ok) {
          const data = await projRes.json();
          setProjects(data.data || []);
        }
      } catch (e) {
        console.error('Failed to load references', e);
      }
    };
    if (open) fetchReferences();
  }, [open]);

  const reset = () => {
    setReportCategory(isAttendanceOnly ? 'Attendance Report' : (isEmployee ? 'My Complete Employee Report' : 'Overall Company Report'));
    setFormat('pdf');
    setScope('all');
    setAttendancePeriod('daily');
    setDate('');
    setWeek('');
    setMonth('');
    setYear('');
    setCustomStart('');
    setCustomEnd('');
    setSelectedId('');
    setAttendanceDeptScope('all');
    setAttendanceSelectedDept('');
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      if (isEmployee) {
        const payload = { reportCategory, format: format === 'excel' ? 'excel' : 'pdf' };
        const res = await authFetch(`${API}/reports/my-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        const filename = `${reportCategory.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${ext}`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (reportCategory === 'Attendance Report') {
        // Attendance uses existing backend report generation
        const payload = {
          reportType: attendancePeriod === 'yesterday' ? 'daily' : attendancePeriod,
          format: format === 'excel' ? 'excel' : 'pdf',
          employeeScope: scope === 'all' ? 'all' : 'particular',
        };
        if (attendancePeriod === 'daily') payload.date = date;
        else if (attendancePeriod === 'yesterday') {
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          payload.date = yest.toISOString().split('T')[0];
        }
        else if (attendancePeriod === 'weekly') payload.weekStart = week;
        else if (attendancePeriod === 'monthly') { payload.month = month; if (year) payload.year = year; }
        else if (attendancePeriod === 'yearly') payload.year = year;
        else if (attendancePeriod === 'custom') { payload.customStart = customStart; payload.customEnd = customEnd; }

        if (scope === 'particular' && selectedId) payload.employeeId = Number(selectedId);
        if (attendanceDeptScope === 'particular' && attendanceSelectedDept) {
          const dept = departments.find(d => d.department_id === Number(attendanceSelectedDept));
          if (dept) payload.department = dept.department_name;
        }

        const res = await authFetch(`${API}/attendance/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          let errMsg = 'Export failed';
          try {
            const errData = await res.json();
            if (errData.message) errMsg = errData.message;
          } catch(e) {}
          throw new Error(errMsg);
        }
        const blob = await res.blob();

        // filename logic
        let datePart = date || new Date().toISOString().split('T')[0];
        let filename = `attendance_report_${datePart}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // For other report types, call the new generic backend report generator
        const payload = {
          reportCategory,
          format: format === 'excel' ? 'excel' : 'pdf',
          scope,
          selectedId
        };
        const res = await authFetch(`${API}/reports/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();

        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        const filename = `${reportCategory.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${ext}`;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      }

      toast.success('Report generated successfully');
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => { if (!isLoading) onClose(); }}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Generate Report</h3>
            <p className="text-sm text-gray-500 mt-1">Configure and export your system reports</p>
          </div>
          <button onClick={() => { if (!isLoading) { onClose(); reset(); } }} className="p-2 hover:bg-gray-200 rounded-full transition-colors bg-white shadow-sm border border-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">

          {/* Step 1: Report Type (Hidden if only Attendance) */}
          {!isAttendanceOnly && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
                Select Report Type
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currentReportTypes.map(type => (
                  <label key={type} className={`flex items-center p-3 border rounded-xl cursor-pointer transition-all ${reportCategory === type ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="reportCategory" value={type} checked={reportCategory === type} onChange={() => { setReportCategory(type); setScope('all'); setSelectedId(''); }} className="hidden" />
                    <span className={`text-sm font-medium ${reportCategory === type ? 'text-blue-700' : 'text-gray-700'}`}>{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Dynamic Options */}
          {!isEmployee && reportCategory !== 'Overall Company Report' && (
            <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">2</span>
                Filter Options
              </h4>

              {reportCategory === 'Attendance Report' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                    <select value={attendancePeriod} onChange={e => setAttendancePeriod(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 bg-white border outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="daily">Today / Daily</option>
                      {isAttendanceOnly && <option value="yesterday">Yesterday</option>}
                      <option value="weekly">This Week</option>
                      <option value="monthly">This Month</option>
                      {!isAttendanceOnly && <option value="yearly">Yearly</option>}
                      <option value="custom">Custom Date Range</option>
                    </select>
                  </div>

                  {attendancePeriod === 'daily' && <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border" />}
                  {attendancePeriod === 'weekly' && <input type="week" value={week} onChange={e => setWeek(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border" />}
                  {attendancePeriod === 'monthly' && <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border" />}
                  {attendancePeriod === 'yearly' && <input type="number" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border" />}
                  {attendancePeriod === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border" />
                      <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee Filter</label>
                      <select value={scope} onChange={e => setScope(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white mb-2">
                        <option value="all">All Employees</option>
                        <option value="particular">Particular Employee</option>
                      </select>
                      {scope === 'particular' && (
                        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white">
                          <option value="">Select Employee</option>
                          {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department Filter</label>
                      <select value={attendanceDeptScope} onChange={e => setAttendanceDeptScope(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white mb-2">
                        <option value="all">All Departments</option>
                        <option value="particular">Particular Department</option>
                      </select>
                      {attendanceDeptScope === 'particular' && (
                        <select value={attendanceSelectedDept} onChange={e => setAttendanceSelectedDept(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white">
                          <option value="">Select Department</option>
                          {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {reportCategory === 'Employees Report' && (
                <div>
                  <select value={scope} onChange={e => { setScope(e.target.value); setSelectedId(''); }} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white mb-3">
                    <option value="all">All Employees</option>
                    <option value="particular">Particular Employee</option>
                  </select>
                  {scope === 'particular' && (
                    <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white">
                      <option value="">Select Employee</option>
                      {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>)}
                    </select>
                  )}
                </div>
              )}

              {reportCategory === 'Departments Report' && (
                <div>
                  <select value={scope} onChange={e => { setScope(e.target.value); setSelectedId(''); }} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white mb-3">
                    <option value="all">All Departments</option>
                    <option value="particular">Particular Department</option>
                  </select>
                  {scope === 'particular' && (
                    <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white">
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
                    </select>
                  )}
                </div>
              )}

              {reportCategory === 'Roles Report' && (
                <div>
                  <select value={scope} onChange={e => { setScope(e.target.value); setSelectedId(''); }} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white mb-3">
                    <option value="all">All Roles</option>
                    <option value="particular">Particular Role</option>
                  </select>
                  {scope === 'particular' && (
                    <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white">
                      <option value="">Select Role</option>
                      {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                    </select>
                  )}
                </div>
              )}

              {reportCategory === 'Projects Report' && (
                <div>
                  <select value={scope} onChange={e => { setScope(e.target.value); setSelectedId(''); }} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white mb-3">
                    <option value="all">All Projects</option>
                    <option value="particular">Particular Project</option>
                  </select>
                  {scope === 'particular' && (
                    <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full border-gray-300 rounded-xl p-2.5 border bg-white">
                      <option value="">Select Project</option>
                      {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                    </select>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Step 3: Format Selection */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
                {isAttendanceOnly ? '2' : (!isEmployee && reportCategory !== 'Overall Company Report' ? '3' : '2')}
              </span>
              Select Export Format
            </h4>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all ${format === 'pdf' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-700'}`}>
                <input type="radio" name="format" value="pdf" checked={format === 'pdf'} onChange={() => setFormat('pdf')} className="hidden" />
                <span className="font-semibold">PDF Document</span>
              </label>
              <label className={`flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all ${format === 'excel' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50 text-gray-700'}`}>
                <input type="radio" name="format" value="excel" checked={format === 'excel'} onChange={() => setFormat('excel')} className="hidden" />
                <span className="font-semibold">Excel (.xlsx)</span>
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 sticky bottom-0 z-10 rounded-b-3xl">
          <button onClick={() => { if (!isLoading) { onClose(); reset(); } }} disabled={isLoading} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleDownload} disabled={isLoading} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center font-medium shadow-sm transition-colors disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
