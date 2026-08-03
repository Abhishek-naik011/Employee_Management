const express = require('express');
const router = express.Router();
const { requireAdmin, requirePermission } = require('../middleware/authMiddleware');
const {
    getEmployees,
    getMe,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    updateSalary,
    generateEmployeePassword,
    updateMe
} = require('../controllers/employeeController');

// GET / PUT self profile
router.route('/me')
    .get(getMe)
    .put(updateMe);

router.put('/me/password', require('../controllers/employeeController').updateMyPassword);

// GET all / POST new
router.route('/')
    .get(requirePermission('View Employees'), getEmployees)
    .post(requireAdmin, createEmployee);

// PUT update / DELETE by id
router.route('/:id')
    .put(requireAdmin, updateEmployee)
    .delete(requireAdmin, deleteEmployee);

router.post('/:id/password', requireAdmin, generateEmployeePassword);

// PATCH salary only
router.patch('/:id/salary', requireAdmin, updateSalary);

module.exports = router;
