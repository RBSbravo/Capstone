const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, UserSession } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { 
  register,
  login,
  getProfile, 
  forgotPassword, 
  resetPassword, 
  verifyResetToken 
} = require('../controllers/authController');
const validateSession = require('../middleware/sessionValidation');

// Validation middleware
const validateRegistration = [
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
        // Check if it's a valid string ID format
        if (typeof value !== 'string' || !value.match(/^DEP-[0-9]{8}-[0-9]{5}$/)) {
          throw new Error('Department ID must be a valid string in format DEP-YYYYMMDD-XXXXX');
        }
      } else if (req.body.role === 'admin' && value) {
        // If admin, departmentId should not be provided
        throw new Error('Admin should not have a department');
      }
      return true;
    })
];

const validateLogin = [
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
];

const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
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

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Account not approved by admin' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    // Create a new session
    await UserSession.create({
      userId: user.id,
      token,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt: new Date(Date.now() + 3600000) // 1 hour expiry
    });

    res.json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Register route
router.post('/register', validateRegistration, handleValidationErrors, register);

// Get profile route
router.get('/me', authenticateToken, getProfile);

// Forgot password route
router.post('/forgot-password', validateForgotPassword, handleValidationErrors, forgotPassword);

// Reset password route
router.post('/reset-password', validateResetPassword, handleValidationErrors, resetPassword);

// Verify reset token route
router.get('/verify-reset-token/:token', verifyResetToken);

router.post('/logout', validateSession, async (req, res) => {
  try {
    req.session.isActive = false;
    await req.session.save();
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 