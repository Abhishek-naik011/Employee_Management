import { Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Briefcase } from 'lucide-react';
import { usePermission } from '../context/PermissionContext';
import authFetch from '../utils/authFetch';
import FloatingChatButton from '../components/chatbot/FloatingChatButton';
import ChatPanel from '../components/chatbot/ChatPanel';
import Navbar from '../components/Navbar';
import EmployeeSidebar from '../components/EmployeeSidebar';

const EmployeePortalLayout = () => {
  const navigate = useNavigate();
  const { user } = usePermission();

  const handleLogout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    navigate('/login', { replace: true });
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-[#f4f7fb] overflow-hidden">
      <EmployeeSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f4f7fb] p-6 relative">
          <Outlet />
        </main>
      </div>
      <FloatingChatButton />
      <ChatPanel />
    </div>
  );
};

export default EmployeePortalLayout;
