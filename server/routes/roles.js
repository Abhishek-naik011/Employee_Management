const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin, requirePermission } = require('../middleware/authMiddleware');
const { getRoles, createRole, updateRole, deleteRole, getAvailablePermissions } = require('../controllers/roleController');

router.get('/available-permissions', verifyToken, getAvailablePermissions);

// GET all roles — requires login; any authenticated user can list roles (needed for dropdowns)
// POST / PUT / DELETE — Admin only
router.route('/')
    .get(verifyToken, getRoles)
    .post(verifyToken, requirePermission('Manage Roles'), createRole);

router.route('/:id')
    .put(verifyToken, requirePermission('Manage Roles'), updateRole)
    .delete(verifyToken, requirePermission('Manage Roles'), deleteRole);

module.exports = router;
