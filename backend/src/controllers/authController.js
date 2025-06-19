const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, UserSession } = require('../models');
const { Op } = require('sequelize');
const testConfig = require('../config/test.config');

// Get JWT secret based on environment
const getJwtSecret = () => {
  return process.env.NODE_ENV === 'test' ? testConfig.jwt.secret : process.env.JWT_SECRET;
};

// Register a new user
const register = async (req, res) => {
  try {
    const { username, email, password, role, departmentId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Only employees and department heads require departmentId and are set to pending
    let status = 'approved';
    let finalDepartmentId = null;
    if (role === 'department_head' || role === 'employee') {
      if (!departmentId) {
        return res.status(400).json({ error: 'Department is required for this role' });
      }
      status = 'pending';
      finalDepartmentId = departmentId;
    } else if (role === 'admin') {
      // Admin users don't need a department and are automatically approved
      status = 'approved';
      finalDepartmentId = null;
    }

    // Create user (password will be hashed by model hook)
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'employee', // Default role is employee
      departmentId: finalDepartmentId,
      status
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    // Return user data (excluding password) and token
    const userData = user.toJSON();
    delete userData.password;
    res.status(201).json({ user: userData, token });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password using model method
    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Block login if not approved
    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Account not approved by admin' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    // Create a session in UserSession table
    await UserSession.create({
      userId: user.id,
      token,
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Return user data (excluding password) and token
    const userData = user.toJSON();
    delete userData.password;
    res.json({ user: userData, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    // Find the session and mark as inactive
    const session = await UserSession.findOne({ where: { token, isActive: true } });
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    session.isActive = false;
    await session.save();
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const userData = req.user.toJSON();
    delete userData.password;
    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    await user.update({
      resetToken,
      resetTokenExpiry
    });

    // In a real application, you would send an email here
    // For testing purposes, we'll just return the token
    res.json({
      message: 'Password reset email sent',
      resetToken // Only include this in development/test
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    await user.update({
      password,
      resetToken: null,
      resetTokenExpiry: null
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Valid reset token' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  forgotPassword,
  resetPassword,
  verifyResetToken
}; 