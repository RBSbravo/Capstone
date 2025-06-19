const express = require('express');
const cors = require('cors');
const http = require('http');
const { initializeSocket } = require('./services/socketService');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const analyticsRoutes = require('./routes/analytics');
const ticketRoutes = require('./routes/ticketRoutes');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/files', fileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ error: err.errors[0].message });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ error: 'Record already exists' });
  }
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

module.exports = { app, server }; 