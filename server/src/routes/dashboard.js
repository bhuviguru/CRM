const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/stats', dashboardController.getStats);
router.get('/churn-risk', dashboardController.getChurnRisk);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;
