import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import FloatingChatButton from '../components/chatbot/FloatingChatButton';
import ChatPanel from '../components/chatbot/ChatPanel';

const DashboardLayout = () => {
  return (
    <div className="flex h-screen bg-[#f4f7fb] overflow-hidden">
      <Sidebar />
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

export default DashboardLayout;
