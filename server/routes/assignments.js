const express = require('express');
const router = express.Router();
const { verifyToken, requirePermission } = require('../middleware/authMiddleware');
const { getAssignments, createAssignment, deleteAssignment } = require('../controllers/assignmentController');

router.route('/')
    .get(verifyToken, getAssignments)
    .post(requirePermission('Assign Employees'), createAssignment);

router.route('/:id')
    .delete(requirePermission('Assign Employees'), deleteAssignment);

module.exports = router;
