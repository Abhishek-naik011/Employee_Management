const express = require('express');
const router = express.Router();
const { requireAdmin, requirePermission } = require('../middleware/authMiddleware');
const { getDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');

router.route('/')
    .get(requirePermission('View Departments'), getDepartments)
    .post(requirePermission('Manage Departments'), createDepartment);

router.route('/:id')
    .put(requirePermission('Manage Departments'), updateDepartment)
    .delete(requirePermission('Manage Departments'), deleteDepartment);

module.exports = router;
