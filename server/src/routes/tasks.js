const express = require('express');
const router = express.Router();
const taskController = require('../controllers/tasks');
const { authenticate, authorize } = require('../middleware/auth');
const { validateTask, validateUUIDParam } = require('../middleware/validation');
const { readLimiter, writeLimiter } = require('../middleware/simpleRateLimiter');

// All routes require authentication
router.get('/', authenticate, readLimiter, taskController.getAllTasks);
router.post('/', authenticate, writeLimiter, validateTask, taskController.createTask);
router.put('/:id', authenticate, writeLimiter, validateUUIDParam('id'), taskController.updateTask);
router.delete('/:id', authenticate, authorize('admin'), writeLimiter, validateUUIDParam('id'), taskController.deleteTask);

module.exports = router;
