// server/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const { applyLeave, getBalance, getHistory, getRequests, approveLeave, rejectLeave } = require('../controllers/leaveController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkAdmin } = require('../middleware/check_admin'); // assumes existing admin check middleware

// Apply for leave (employee)
router.post('/', verifyToken, applyLeave);

// Get leave balance (employee)
router.get('/balance', verifyToken, getBalance);

// Get leave history (employee)
router.get('/history', verifyToken, getHistory);

// Admin: list all leave requests with optional filters
router.get('/requests', verifyToken, checkAdmin, getRequests);

// Admin: approve a leave request
router.put('/:id/approve', verifyToken, checkAdmin, approveLeave);

// Admin: reject a leave request
router.put('/:id/reject', verifyToken, checkAdmin, rejectLeave);

module.exports = router;
