import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, CheckCircle2, XCircle, AlertCircle, History, UserCheck, UserX, FileText, X
} from 'lucide-react';
import authFetch from '../utils/authFetch';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateUtils';

const StatCard = ({ title, value, suffix, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer relative overflow-hidden group">
    <div className={`p-4 rounded-2xl ${color} text-white relative z-10 flex-shrink-0`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="relative z-10 w-full overflow-hidden">
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <div className="flex items-end gap-2">
        <h3 className="text-2xl font-bold text-gray-900 truncate">{value}</h3>
        {suffix && <span className={`text-sm font-medium mb-1 ${color.replace('bg-', 'text-')} whitespace-nowrap`}>{suffix}</span>}
      </div>
    </div>
  </div>
);

const API = import.meta.env.VITE_API_URL;

const EmployeeAttendance = () => {
  const [stats, setStats] = useState({
    presentDays: 0,
    absentDays: 0,
    lateCheckIns: 0,
    totalWorkingHours: 0
  });

  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regForm, setRegForm] = useState({
    attendance_date: '',
    issue_type: 'Forgot Check-in',
    current_check_in: '',
    current_check_out: '',
    requested_check_in: '',
    requested_check_out: '',
    reason: ''
  });

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API}/attendance/regularization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Regularization request submitted');
        setRegModalOpen(false);
        setRegForm({
          attendance_date: '', issue_type: 'Forgot Check-in', current_check_in: '',
          current_check_out: '', requested_check_in: '', requested_check_out: '', reason: ''
        });
      } else {
        toast.error(data.message || 'Failed to submit request');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };
  const [shiftProgress, setShiftProgress] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // For live timer update
  const [liveDuration, setLiveDuration] = useState(0);

  useEffect(() => {
    fetchData();
    
    const handleUpdate = () => {
      fetchData();
    };
    
    window.addEventListener('chatbot_action_success', handleUpdate);
    window.addEventListener('attendance_updated', handleUpdate);
    
    return () => {
      window.removeEventListener('chatbot_action_success', handleUpdate);
      window.removeEventListener('attendance_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    let interval;
    if (shiftProgress && shiftProgress.status === 'Working' && shiftProgress.check_in_time) {
      interval = setInterval(() => {
        const now = new Date();
        const checkIn = new Date(shiftProgress.check_in_time);
        
        let startToNowMinutes = Math.floor((now - checkIn) / 60000);
        let totalMins = (shiftProgress.previous_working_minutes || 0);

        if (shiftProgress.resume_start_time) {
          const resumeTime = new Date(shiftProgress.resume_start_time);
          totalMins += Math.floor((now - resumeTime) / 60000);
        } else {
          totalMins = startToNowMinutes;
        }

        setLiveDuration(totalMins);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [shiftProgress]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API}/attendance/my-stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data.stats);
        setShiftProgress(data.data.todayShift);
        setWeeklyData(data.data.weeklyChart);
        setHistory(data.data.history);
        
        if (data.data.todayShift) {
           setLiveDuration(data.data.todayShift.working_minutes || 0);
        }
      }
    } catch (err) {
      toast.error('Failed to load attendance data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMinutes = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${h}h ${m}m`;
  };

  const getDayName = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  };



  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Attendance</h1>
          <p className="text-gray-500 mt-2">Track your daily shift, monthly stats, and working hours.</p>
        </div>
        <button 
          onClick={() => setRegModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FileText className="w-5 h-5" />
          Attendance Regularization
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Present Days (This Month)"
          value={stats.presentDays}
          suffix="days"
          icon={UserCheck}
          color="bg-emerald-500"
        />
        <StatCard
          title="Absent Days (This Month)"
          value={stats.absentDays}
          suffix="days"
          icon={UserX}
          color="bg-red-500"
        />
        <StatCard
          title="Late Check-ins (This Month)"
          value={stats.lateCheckIns}
          suffix="days"
          icon={AlertCircle}
          color="bg-orange-500"
        />
        <StatCard
          title="Total Hours (This Month)"
          value={`${Math.floor(stats.totalWorkingHours / 60)}h ${stats.totalWorkingHours % 60}m`}
          icon={Clock}
          color="bg-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Shift Progress */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              Today's Shift Progress
            </h2>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center gap-6">
            {!shiftProgress ? (
              <div className="text-center text-gray-500">
                <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>You haven't checked in today.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Check In</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(shiftProgress.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Check Out</p>
                    <p className="font-semibold text-gray-900">
                      {shiftProgress.check_out_time ? new Date(shiftProgress.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </p>
                  </div>
                </div>

                <div className="text-center py-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Current Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                    shiftProgress.status === 'Working' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    shiftProgress.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {shiftProgress.status}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">Working Time</span>
                    <span className="font-bold text-indigo-600">
                      {formatMinutes(shiftProgress.status === 'Working' ? liveDuration : shiftProgress.working_minutes)} / 8h
                    </span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-linear"
                      style={{ 
                        width: `${Math.min(100, ((shiftProgress.status === 'Working' ? liveDuration : shiftProgress.working_minutes) / (8 * 60)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Weekly Attendance Chart
            </h2>
          </div>
          <div className="p-6 flex-1 flex items-end gap-2 h-64">
            {weeklyData.map((day, i) => {
               const maxMins = 480; // 8 working hours = 480 minutes
               let displayMins = day.minutes;
               // Live update today's bar
               if (shiftProgress && shiftProgress.status === 'Working' && new Date().toISOString().split('T')[0] === day.date) {
                 displayMins = liveDuration;
               }
               // barHeight = min((working_minutes / 480) * 100, 100)
               const heightPercent = Math.min((displayMins / maxMins) * 100, 100);
               return (
                 <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                   <div className="text-xs font-medium text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                     {formatMinutes(displayMins)}
                   </div>
                   <div className="w-full max-w-[40px] bg-gray-100 rounded-t-lg relative flex items-end justify-center h-full">
                     <div 
                       className="w-full bg-indigo-500 rounded-t-lg transition-all duration-1000"
                       style={{ height: `${heightPercent}%` }}
                     />
                   </div>
                   <span className="text-sm font-medium text-gray-600">{day.dayName}</span>
                 </div>
               )
            })}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            Recent Attendance History
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Working Hours</th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((record, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                    {formatDate(record.attendance_date)}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                    {formatMinutes(record.working_minutes || 0)}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <div className="flex flex-col items-start">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        record.status === 'Working' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        record.status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {record.approvedByName ? 'Regularized' : record.status}
                      </span>
                      
                      {record.approvedByName && (
                        <div className="mt-2 text-xs text-gray-500 whitespace-nowrap">
                          <p className="font-semibold text-gray-700">Approved By</p>
                          <p className="mb-1">{record.approvedByName} ({record.approvedByRole})</p>
                          <p className="font-semibold text-gray-700">Approved On</p>
                          <p>{new Date(record.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(record.approvedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-gray-500">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Regularization Modal */}
      {regModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setRegModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
              <h3 className="text-lg font-bold text-gray-900">Attendance Regularization</h3>
              <button onClick={() => setRegModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleRegSubmit} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Date *</label>
                <input required type="date" value={regForm.attendance_date} onChange={e => setRegForm({...regForm, attendance_date: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type *</label>
                <select required value={regForm.issue_type} onChange={e => setRegForm({...regForm, issue_type: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="Forgot Check-in">Forgot Check-in</option>
                  <option value="Forgot Check-out">Forgot Check-out</option>
                  <option value="Incorrect Hours">Incorrect Hours</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Check In</label>
                  <input type="time" value={regForm.current_check_in} onChange={e => setRegForm({...regForm, current_check_in: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Check Out</label>
                  <input type="time" value={regForm.current_check_out} onChange={e => setRegForm({...regForm, current_check_out: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check In</label>
                  <input type="time" value={regForm.requested_check_in} onChange={e => setRegForm({...regForm, requested_check_in: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check Out</label>
                  <input type="time" value={regForm.requested_check_out} onChange={e => setRegForm({...regForm, requested_check_out: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea required rows="3" value={regForm.reason} onChange={e => setRegForm({...regForm, reason: e.target.value})} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="Provide a valid reason..."></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setRegModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendance;
