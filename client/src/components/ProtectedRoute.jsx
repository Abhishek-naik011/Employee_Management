import { Navigate, Outlet } from 'react-router-dom';
import { usePermission } from '../context/PermissionContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ adminOnly = false }) => {
  const { user, loading } = usePermission();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Not logged in at all
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If this route requires Admin role and the user is not Admin, block access
  if (adminOnly && user.role_name !== 'Admin') {
    return <Navigate to="/employee-dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
