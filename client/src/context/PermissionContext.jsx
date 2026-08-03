import React, { createContext, useState, useEffect, useContext } from 'react';
import authFetch from '../utils/authFetch';

const PermissionContext = createContext({
  user: null,
  permissions: [],
  loading: true,
});

export const PermissionProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const res = await authFetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        const perms = Array.isArray(data.user.permissions)
          ? data.user.permissions
          : typeof data.user.permissions === 'string'
            ? JSON.parse(data.user.permissions || '[]')
            : [];
        setUser(data.user);
        setPermissions(perms);
      } else {
        setUser(null);
        setPermissions([]);
      }
    } catch (e) {
      console.error('Failed to load user permissions', e);
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const isAdmin = user?.role_name === 'Admin';

  const hasPermission = (requires) => {
    if (isAdmin) return true;
    if (!requires) return true;
    const reqArray = Array.isArray(requires) ? requires : [requires];
    return reqArray.some(p => permissions.includes(p));
  };

  const canPerformAction = (requires) => {
    if (isAdmin) return true;
    return hasPermission(requires);
  };

  return (
    <PermissionContext.Provider value={{ user, permissions, loading, hasPermission, isAdmin, canPerformAction, loadUser }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => useContext(PermissionContext);
