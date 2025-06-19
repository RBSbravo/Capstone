const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateComment } = require('../middleware/commentValidation');
const {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment
} = require('../controllers/commentController');

// Create a new comment
router.post('/',
  authenticateToken,
  validateComment,
  createComment
);

// Get comments for a task
router.get('/task/:taskId',
  authenticateToken,
  getTaskComments
);

// Update a comment
router.put('/:id',
  authenticateToken,
  validateComment,
  updateComment
);

// Delete a comment
router.delete('/:id',
  authenticateToken,
  deleteComment
);

module.exports = router; 