const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { User, Department } = require('../models');

// Validation middleware
const validateUser = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .isIn(['admin', 'department_head', 'employee'])
    .withMessage('Invalid role'),
  
  body('departmentId')
    .custom((value, { req }) => {
      if (req.body.role === 'department_head' || req.body.role === 'employee') {
        if (!value) {
          throw new Error('Department is required for this role');
        }
        if (typeof value !== 'string' || !value.match(/^DEP-[0-9]{8}-[0-9]{5}$/)) {
          throw new Error('Department ID must be in the format DEP-YYYYMMDD-XXXXX');
        }
      }
      return true;
    })
];

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = errors.array()[0];
    return res.status(400).json({ error: error.msg });
  }
  next();
};

// Get all users (admin only)
router.get('/',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res) => {
    try {
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'role', 'departmentId', 'status'],
        include: [{
          model: Department,
          attributes: ['id', 'name']
        }]
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get user profile
router.get('/profile',
  authenticateToken,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'email', 'role', 'departmentId', 'status'],
        include: [{
          model: Department,
          attributes: ['id', 'name']
        }]
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Create new user (admin only)
router.post('/',
  authenticateToken,
  authorizeRole(['admin']),
  validateUser,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, email, password, role, departmentId } = req.body;
      const user = await User.create({
        username,
        email,
        password,
        role,
        departmentId,
        status: 'approved' // Admin-created users are automatically approved
      });
      res.status(201).json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        status: user.status
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Update user (admin or self)
router.put('/:id',
  authenticateToken,
  validateUser,
  handleValidationErrors,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Only admin can update other users
      if (req.user.id !== user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this user' });
      }

      const { username, email, password, role, departmentId } = req.body;
      await user.update({
        username,
        email,
        password,
        role,
        departmentId
      });

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        status: user.status
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete user (admin only)
router.delete('/:id',
  authenticateToken,
  authorizeRole(['admin']),
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      await user.destroy();
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Approve user (admin only)
router.patch('/:id/approve', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await user.update({ status: 'approved' });
    const updatedUser = await User.findByPk(req.params.id);
    res.json({ message: 'User approved successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject user (admin only)
router.patch('/:id/reject', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await user.update({ status: 'rejected' });
    res.json({ message: 'User rejected successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 