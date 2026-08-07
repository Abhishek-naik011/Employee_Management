const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAdmin } = require('../middleware/authMiddleware');

router.post('/generate', requireAdmin, reportController.generateGenericReport);
router.post('/my-report', reportController.generateMyReport);

module.exports = router;
