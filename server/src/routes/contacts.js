const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contacts');
const { authenticate, authorize } = require('../middleware/auth');
const { validateContact, validateUUIDParam } = require('../middleware/validation');
const { readLimiter, writeLimiter } = require('../middleware/simpleRateLimiter');

// All routes require authentication
router.get('/', authenticate, readLimiter, contactController.getAllContacts);
router.post('/', authenticate, writeLimiter, validateContact, contactController.createContact);
router.put('/:id', authenticate, writeLimiter, validateUUIDParam('id'), validateContact, contactController.updateContact);
router.delete('/:id', authenticate, authorize('admin'), writeLimiter, validateUUIDParam('id'), contactController.deleteContact);

module.exports = router;
