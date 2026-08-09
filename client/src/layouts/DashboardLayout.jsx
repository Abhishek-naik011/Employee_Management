import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import FloatingChatButton from '../components/chatbot/FloatingChatButton';
import ChatPanel from '../components/chatbot/ChatPanel';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f4f7fb] overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex items-center md:hidden bg-white border-b border-gray-200 px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
        </div>
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

export default DashboardLayout;