import { usePermission } from '../context/PermissionContext';

const PermissionGate = ({ requires, children }) => {
  const { hasPermission, user } = usePermission();
  
  if (user?.role_name === 'Admin' || hasPermission(requires)) {
    return <>{children}</>;
  }
  
  return null;
};

export default PermissionGate;
