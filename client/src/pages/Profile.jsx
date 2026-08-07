import { useState, useEffect } from 'react';
import { User, Mail, Briefcase, Camera, Shield, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import PermissionGate from '../components/PermissionGate';
import authFetch from '../utils/authFetch';
import { usePermission } from '../context/PermissionContext';
import PrimaryButton from '../components/common/PrimaryButton';

const API = 'http://localhost:5000/api';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const { user } = usePermission();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    location: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await authFetch(`${API}/employees/me`);
        const result = await res.json();
        if (result.success && result.data) {
          setFormData({
            full_name: result.data.full_name || '',
            email: result.data.email || '',
            phone: result.data.phone || '',
            location: result.data.location || ''
          });
        }
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`${API}/employees/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        toast.success('Profile updated successfully!');
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Error updating profile');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    try {
      const res = await authFetch(`${API}/employees/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const result = await res.json();
      
      if (result.success) {
        toast.success('Password updated successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(result.message || 'Failed to update password');
      }
    } catch (error) {
      toast.error('Error updating password');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
      
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold shadow-md">
            {formData.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-600 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center sm:text-left flex-1">
          <h3 className="text-xl font-bold text-gray-900">{formData.full_name || 'User'}</h3>
          <p className="text-gray-500">{user?.role_name || 'Employee'}</p>
          <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1"><Mail className="w-4 h-4" /> {formData.email}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 border-r border-gray-100 p-6 space-y-2 bg-gray-50/50">
          <button 
            onClick={() => setActiveTab('personal')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
              activeTab === 'personal' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <User className="w-4 h-4" /> Personal Info
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
              activeTab === 'security' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Shield className="w-4 h-4" /> Security
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 lg:p-8">
          {activeTab === 'personal' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Personal Information</h3>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <input name="full_name" value={formData.full_name} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                    <input name="phone" value={formData.phone} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                    <input name="location" value={formData.location} onChange={handleChange} type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <PrimaryButton type="submit" icon={<Save className="w-4 h-4" />}>
                    Save Changes
                  </PrimaryButton>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Change Password</h3>
              <form onSubmit={handlePasswordUpdate} className="space-y-5 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                  <input type="password" required value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input type="password" required value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <input type="password" required value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <PermissionGate requires="Manage Profile">
                  <div className="pt-4">
                    <button type="submit" className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all">
                      <Shield className="w-4 h-4" /> Update Password
                    </button>
                  </div>
                </PermissionGate>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
