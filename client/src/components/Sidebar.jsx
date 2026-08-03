import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, FolderKanban, ShieldCheck, UserCircle, LogOut } from 'lucide-react';
import authFetch from '../utils/authFetch';

const Sidebar = () => {
  const navigate = useNavigate();
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Employees', icon: Users, path: '/employees' },
    { name: 'Departments', icon: Building2, path: '/departments' },
    { name: 'Projects', icon: FolderKanban, path: '/projects' },
    { name: 'Roles', icon: ShieldCheck, path: '/roles' },
    { name: 'Profile', icon: UserCircle, path: '/profile' },
  ];

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
    <div className="flex flex-col h-full w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-center h-20 border-b border-gray-100">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          EmpManage
        </h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
