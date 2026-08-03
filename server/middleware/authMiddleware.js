const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';

// 1. Verify Token Middleware
exports.verifyToken = (req, res, next) => {
    try {
        let token = req.cookies?.token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided. Authorization denied.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, role_id, role_name, permissions, email }
        
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

// 2. Require Specific Permission Middleware
exports.requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const permissionsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

        const loadPermissions = async () => {
            if (req.user.role_name === 'Admin') {
                return { allowed: true };
            }

            const roleId = req.user.role_id;
            if (!roleId) {
                const tokenPermissions = req.user.permissions || [];
                return { allowed: permissionsToCheck.some(permission => tokenPermissions.includes(permission)) };
            }

            const result = await pool.query('SELECT permissions FROM roles WHERE role_id = $1', [roleId]);
            const rolePermissions = result.rows[0]?.permissions;
            const permissions = Array.isArray(rolePermissions)
                ? rolePermissions
                : typeof rolePermissions === 'string'
                    ? JSON.parse(rolePermissions || '[]')
                    : (rolePermissions || []);

            return { allowed: permissionsToCheck.some(permission => permissions.includes(permission)) };
        };

        loadPermissions()
            .then(({ allowed }) => {
                if (!allowed) {
                    return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions.' });
                }

                return next();
            })
            .catch((error) => {
                console.error('Permission check error:', error);
                return res.status(500).json({ success: false, message: 'Server error during permission check.' });
            });
    };
};

// 3. Require Admin Middleware (for sensitive routes)
exports.requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role_name !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin access required.' });
    }
    next();
};
