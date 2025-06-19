const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateTaskCreation, validateTaskUpdate, validateTaskQuery } = require('../middleware/taskValidation');
const { createTask, getAllTasks, getTaskById, updateTask, deleteTask } = require('../controllers/taskController');

// Create a new task (admin and department head only)
router.post('/',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  validateTaskCreation,
  createTask
);

// Get all tasks (with filters)
router.get('/',
  authenticateToken,
  validateTaskQuery,
  getAllTasks
);

// Get task by ID
router.get('/:id',
  authenticateToken,
  getTaskById
);

// Update task
router.put('/:id',
  authenticateToken,
  validateTaskUpdate,
  updateTask
);

// Delete task (admin only)
router.delete('/:id',
  authenticateToken,
  authorizeRole(['admin']),
  deleteTask
);

module.exports = router; 