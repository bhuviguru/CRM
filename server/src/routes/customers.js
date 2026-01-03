const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customers');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCustomer, validateUUIDParam, validatePagination } = require('../middleware/validation');
const { readLimiter, writeLimiter, expensiveLimiter } = require('../middleware/simpleRateLimiter');

// All routes require authentication
router.get('/', authenticate, readLimiter, validatePagination, customerController.getAllCustomers);
router.post('/', authenticate, writeLimiter, validateCustomer, customerController.createCustomer);
router.put('/:id', authenticate, writeLimiter, validateUUIDParam('id'), validateCustomer, customerController.updateCustomer);
router.delete('/:id', authenticate, authorize('admin'), writeLimiter, validateUUIDParam('id'), customerController.deleteCustomer);
router.get('/:id/activity', authenticate, validateUUIDParam('id'), customerController.getCustomerActivity);
router.post('/analyze-all', authenticate, expensiveLimiter, customerController.analyzeAllCustomers);

module.exports = router;
