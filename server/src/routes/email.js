const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email');
const { authenticate } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/simpleRateLimiter');

// All routes require authentication
router.use(authenticate);

router.post('/send', writeLimiter, emailController.sendEmail);
router.get('/templates', emailController.getTemplates);
router.post('/templates', writeLimiter, emailController.createTemplate);
router.get('/history/:customerId', emailController.getEmailHistory);

module.exports = router;
