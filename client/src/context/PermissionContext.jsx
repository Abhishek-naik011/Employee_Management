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
      console.log("========== Loading User ==========");

      const res = await authFetch('/api/auth/me');

      console.log("Status:", res.status);

      const data = await res.json();

      console.log("Response:", data);

      if (data.success) {
        const perms = Array.isArray(data.user.permissions)
          ? data.user.permissions
          : typeof data.user.permissions === 'string'
            ? JSON.parse(data.user.permissions || '[]')
            : [];

        setUser(data.user);
        setPermissions(perms);

        console.log("✅ User Loaded:", data.user);
        console.log("Permissions:", perms);
      } else {
        console.log("❌ API returned success:false");

        setUser(null);
        setPermissions([]);
      }
    } catch (e) {
      console.error("❌ Failed to load user:", e);

      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);

      console.log("========== Done Loading ==========");
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const isAdmin = user?.role_name === 'Admin';

  const hasPermission = (requires) => {
    if (isAdmin) return true;
    if (!requires) return true;

    const reqArray = Array.isArray(requires)
      ? requires
      : [requires];

    return reqArray.some(p => permissions.includes(p));
  };

  const canPerformAction = (requires) => {
    if (isAdmin) return true;
    return hasPermission(requires);
  };

  return (
    <PermissionContext.Provider
      value={{
        user,
        permissions,
        loading,
        hasPermission,
        isAdmin,
        canPerformAction,
        loadUser
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => useContext(PermissionContext);
