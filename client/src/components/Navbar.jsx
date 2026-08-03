import { Search, Bell, User } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm flex items-center justify-between px-8 z-10 sticky top-0">
      <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 w-96 border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-300">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search employees, projects..."
          className="bg-transparent border-none outline-none px-3 text-sm w-full text-gray-700"
        />
      </div>
      <div className="flex items-center gap-6">
        <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors duration-200">
          <Bell className="w-6 h-6 text-gray-600" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-gray-200 cursor-pointer">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">System Admin</p>
            <p className="text-xs text-gray-500">Superadmin</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
