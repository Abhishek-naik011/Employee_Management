import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { usePermission } from '../context/PermissionContext.jsx';
import toast from 'react-hot-toast';

/**
 * PermissionRoute — wraps portal routes that require a specific permission.
 *
 * Permissions are refreshed from PostgreSQL via /employees/me so role updates
 * are picked up automatically on refresh or next navigation.
 *
 * Usage in App.jsx:
 *   <Route element={<PermissionRoute permission="View Employees" />}>
 *     <Route path="/portal/employees" element={<Employees isEmployeeView />} />
 *   </Route>
 */
const PermissionRoute = ({ permission }) => {
  const { user, permissions, loading } = usePermission();
  const permissionsToCheck = Array.isArray(permission) ? permission : [permission];

  const allowed = user?.role_name === 'Admin' || permissionsToCheck.some(p => permissions.includes(p));

  useEffect(() => {
    if (!loading && user && !allowed) {
      toast.error(`Access denied: You lack the "${permissionsToCheck[0]}" permission.`, {
        id: `perm-${permissionsToCheck[0]}`,
      });
    }
  }, [loading, user, allowed, permissionsToCheck]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowed) {
    return <Outlet />;
  }

  return <Navigate to="/employee-dashboard" replace />;
};

export default PermissionRoute;
