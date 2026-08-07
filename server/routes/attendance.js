const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { requireAdmin, requirePermission } = require('../middleware/authMiddleware');

router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.get('/today', attendanceController.getToday);
router.get('/my-stats', attendanceController.getEmployeeStats);

// Admin / Manage Attendance routes
router.get('/summary', requirePermission('Manage Attendance Regularization'), attendanceController.getSummary);
router.get('/all', requirePermission('Manage Attendance Regularization'), attendanceController.getAll);
router.put('/:id', requireAdmin, attendanceController.editAttendance);
router.post('/:id/resume', requireAdmin, attendanceController.resumeWork);
router.post('/:id/force-checkout', requireAdmin, attendanceController.forceCheckOut);

// New export report endpoint
router.post('/report', requirePermission('Manage Attendance Regularization'), attendanceController.generateReport);

const regController = require('../controllers/regularizationController');
// Regularization endpoints
router.post('/regularization', regController.createRequest);
router.get('/regularization/my-requests', regController.getEmployeeRequests);
router.get('/regularization/all', requirePermission('Manage Attendance Regularization'), regController.getAllRequests);
router.put('/regularization/:id/approve', requirePermission('Manage Attendance Regularization'), regController.approveRequest);
router.put('/regularization/:id/reject', requirePermission('Manage Attendance Regularization'), regController.rejectRequest);

module.exports = router;
