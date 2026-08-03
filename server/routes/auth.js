const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Existing Routes
router.post('/login', authController.login);
router.post('/first-password', authController.changePassword);
router.post('/register', authController.register);
router.post('/change-password', verifyToken, authController.changePassword);

// New Routes
router.post('/logout', authController.logout);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
