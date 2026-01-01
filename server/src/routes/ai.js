const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai');
const { authenticate } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/simpleRateLimiter');

// All routes require authentication
router.use(authenticate);

// Prediction endpoints
router.post('/churn', writeLimiter, aiController.predictChurn);
router.get('/predictions/:customerId', aiController.getPrediction);
router.get('/predictions/:customerId/history', aiController.getPredictionHistory);
router.post('/predictions/:predictionId/override', writeLimiter, aiController.overridePrediction);

// Model info
router.get('/model/performance', aiController.getModelPerformance);

module.exports = router;
