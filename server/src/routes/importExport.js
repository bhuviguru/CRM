const express = require('express');
const router = express.Router();
const importExportController = require('../controllers/importExport');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Export routes
router.get('/export/customers', importExportController.exportCustomers);
router.get('/export/contacts', importExportController.exportContacts);
router.get('/export/tasks', importExportController.exportTasks);

// Import routes
router.post('/import/customers', importExportController.importCustomers);

// Bulk operations
router.post('/bulk/delete', importExportController.bulkDeleteCustomers);
router.post('/bulk/update-status', importExportController.bulkUpdateStatus);

// Advanced search
router.post('/search', importExportController.advancedSearch);

module.exports = router;
