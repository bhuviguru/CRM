const express = require('express');
const router = express.Router();
const emailTemplatesController = require('../controllers/emailTemplates');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', emailTemplatesController.getAllTemplates);
router.get('/:id', emailTemplatesController.getTemplateById);
router.post('/', emailTemplatesController.createTemplate);
router.put('/:id', emailTemplatesController.updateTemplate);
router.delete('/:id', emailTemplatesController.deleteTemplate);
router.post('/send', emailTemplatesController.sendTemplateEmail);

module.exports = router;
