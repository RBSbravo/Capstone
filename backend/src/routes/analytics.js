const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { body, query, param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const exportUtils = require('../utils/exportUtils');
const fs = require('fs');
const analyticsService = require('../services/analyticsService');
const { Task, User, Department } = require('../models');

// Validation middleware
const validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (endDate && req.query.startDate) {
        if (new Date(endDate) < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    })
];

// Add filter validation
const filterValidation = [
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('priority').optional().isIn(['high', 'medium', 'low']).withMessage('Invalid priority'),
  query('assignedTo').optional().isString().withMessage('AssignedTo must be a string').matches(/^USR-[0-9]{8}-[0-9]{5}$/).withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  query('createdBy').optional().isString().withMessage('CreatedBy must be a string').matches(/^USR-[0-9]{8}-[0-9]{5}$/).withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX')
];

// Routes
router.get(
  '/department/:departmentId/metrics',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('departmentId').isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  validateDateRange,
  filterValidation,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  analyticsController.getDepartmentMetrics
);

router.get(
  '/user/:userId/performance',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('userId').isString().withMessage('User ID must be a string').matches(/^USR-[0-9]{8}-[0-9]{5}$/).withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  validateDateRange,
  filterValidation,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  analyticsController.getUserPerformance
);

router.get(
  '/department/:departmentId/analytics',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('departmentId').isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  validateDateRange,
  analyticsController.getDepartmentAnalytics
);

router.post(
  '/update-metrics',
  authenticateToken,
  authorizeRole(['admin']),
  analyticsController.updateMetrics
);

// New routes for enhanced analytics
router.get(
  '/department/:departmentId/trends',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('departmentId').isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  query('period').isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid period'),
  validateDateRange,
  filterValidation,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  analyticsController.getTaskTrends
);

router.get(
  '/user/:userId/activity',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('userId').isString().withMessage('User ID must be a string').matches(/^USR-[0-9]{8}-[0-9]{5}$/).withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  query('action').optional().isIn(['login', 'task_create', 'task_update', 'task_complete', 'comment_add']),
  validateDateRange,
  analyticsController.getActivityLogs
);

// Custom Reports routes
router.post(
  '/reports',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  [
    body('name').trim().notEmpty().withMessage('Report name is required'),
    body('type').isIn(['task', 'user', 'department', 'custom']).withMessage('Invalid report type'),
    body('parameters').isObject().withMessage('Parameters must be an object'),
    body('schedule').optional().isObject().withMessage('Schedule must be an object')
  ],
  analyticsController.createCustomReport
);

router.get(
  '/reports',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  query('type').optional().isIn(['task', 'user', 'department', 'custom']),
  query('isActive').optional().isBoolean(),
  analyticsController.listCustomReports
);

router.get(
  '/reports/:reportId',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('reportId').isString().withMessage('Report ID must be a string').matches(/^RPT-[0-9]{8}-[0-9]{5}$/).withMessage('Report ID must be in the format RPT-YYYYMMDD-XXXXX'),
  analyticsController.getCustomReport
);

router.put(
  '/reports/:reportId',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('reportId').isString().withMessage('Report ID must be a string').matches(/^RPT-[0-9]{8}-[0-9]{5}$/).withMessage('Report ID must be in the format RPT-YYYYMMDD-XXXXX'),
  [
    body('name').optional().trim().notEmpty().withMessage('Report name cannot be empty'),
    body('description').optional().isString().withMessage('Description must be a string'),
    body('parameters').optional().isObject().withMessage('Parameters must be an object'),
    body('schedule').optional().isObject().withMessage('Schedule must be an object'),
    body('isActive').optional().isBoolean()
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  analyticsController.updateCustomReport
);

router.delete(
  '/reports/:reportId',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('reportId').isString().withMessage('Report ID must be a string').matches(/^RPT-[0-9]{8}-[0-9]{5}$/).withMessage('Report ID must be in the format RPT-YYYYMMDD-XXXXX'),
  analyticsController.deleteCustomReport
);

router.put(
  '/reports/:reportId/schedule',
  authenticateToken,
  authorizeRole(['admin']),
  param('reportId').isString().withMessage('Report ID must be a string').matches(/^RPT-[0-9]{8}-[0-9]{5}$/).withMessage('Report ID must be in the format RPT-YYYYMMDD-XXXXX'),
  [
    body('cron').isString().withMessage('Cron expression is required'),
    body('recipientEmail').isEmail().withMessage('Recipient email must be valid')
  ],
  analyticsController.updateCustomReportSchedule
);

// Export department metrics
router.get(
  '/department/:departmentId/metrics/export',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('departmentId').isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  query('format').isIn(['csv', 'excel']).withMessage('Format must be csv or excel'),
  validateDateRange,
  async (req, res) => {
    const { departmentId } = req.params;
    const { startDate, endDate, format } = req.query;
    const metrics = await analyticsService.getDepartmentMetrics(
      departmentId,
      startDate,
      endDate
    );
    if (!metrics || metrics.length === 0) {
      if (format === 'csv') {
        // Return CSV with only headers
        const csv = await exportUtils.toCSV([{}]);
        res.header('Content-Type', 'text/csv');
        res.attachment('department-metrics.csv');
        return res.send(csv);
      } else {
        // No content for Excel
        return res.status(204).send();
      }
    }
    if (format === 'csv') {
      const csv = await exportUtils.toCSV(metrics);
      res.header('Content-Type', 'text/csv');
      res.attachment('department-metrics.csv');
      return res.send(csv);
    } else {
      const buffer = await exportUtils.toExcel(metrics, 'Department Metrics');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('department-metrics.xlsx');
      return res.send(Buffer.from(buffer));
    }
  }
);

// Export user performance
router.get(
  '/user/:userId/performance/export',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('userId').isString().withMessage('User ID must be a string').matches(/^USR-[0-9]{8}-[0-9]{5}$/).withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  query('format').isIn(['csv', 'excel']).withMessage('Format must be csv or excel'),
  validateDateRange,
  async (req, res) => {
    const { userId } = req.params;
    const { startDate, endDate, format } = req.query;
    const performance = await analyticsService.getUserPerformanceMetrics(
      userId,
      startDate,
      endDate
    );
    if (!performance || performance.length === 0) {
      if (format === 'csv') {
        const csv = await exportUtils.toCSV([{}]);
        res.header('Content-Type', 'text/csv');
        res.attachment('user-performance.csv');
        return res.send(csv);
      } else {
        return res.status(204).send();
      }
    }
    if (format === 'csv') {
      const csv = await exportUtils.toCSV(performance);
      res.header('Content-Type', 'text/csv');
      res.attachment('user-performance.csv');
      return res.send(csv);
    } else {
      const buffer = await exportUtils.toExcel(performance, 'User Performance');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('user-performance.xlsx');
      return res.send(Buffer.from(buffer));
    }
  }
);

// Export custom report
router.get(
  '/reports/:reportId/export',
  authenticateToken,
  authorizeRole(['admin']),
  param('reportId').isString().withMessage('Report ID must be a string').matches(/^RPT-[0-9]{8}-[0-9]{5}$/).withMessage('Report ID must be in the format RPT-YYYYMMDD-XXXXX'),
  query('format').isIn(['csv', 'excel']).withMessage('Format must be csv or excel'),
  async (req, res) => {
    const { reportId } = req.params;
    const { format } = req.query;
    const result = await analyticsService.generateCustomReport(reportId);
    let data = result.data;
    // If the report data is an object with arrays, flatten for export
    if (typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data);
      if (Array.isArray(data[keys[0]])) {
        data = data[keys[0]];
      }
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      if (format === 'csv') {
        const csv = await exportUtils.toCSV([{}]);
        res.header('Content-Type', 'text/csv');
        res.attachment('custom-report.csv');
        return res.send(csv);
      } else {
        return res.status(204).send();
      }
    }
    if (format === 'csv') {
      const csv = await exportUtils.toCSV(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('custom-report.csv');
      return res.send(csv);
    } else {
      const buffer = await exportUtils.toExcel(data, 'Custom Report');
      res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment('custom-report.xlsx');
      return res.send(Buffer.from(buffer));
    }
  }
);

// Dashboard Visualization Routes
router.get(
  '/dashboard/task-distribution',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  query('departmentId').optional().isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  [
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        if (new Date(endDate) < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
  ],
  filterValidation,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { departmentId, startDate, endDate, status, priority, assignedTo, createdBy } = req.query;
      const distribution = await analyticsService.getTaskDistribution(departmentId, startDate, endDate, { status, priority, assignedTo, createdBy });
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/dashboard/performance-trends',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  query('departmentId').optional().isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  [
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((endDate, { req }) => {
        if (new Date(endDate) < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    query('period')
      .isIn(['daily', 'weekly', 'monthly'])
      .withMessage('Period must be daily, weekly, or monthly')
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { departmentId, startDate, endDate, period } = req.query;
      const trends = await analyticsService.getPerformanceTrends(departmentId, startDate, endDate, period);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/dashboard/department-comparison',
  authenticateToken,
  authorizeRole(['admin']),
  validateDateRange,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const comparison = await analyticsService.getDepartmentComparison(startDate, endDate);
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/dashboard/user-activity',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  query('departmentId').optional().isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  validateDateRange,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { departmentId, startDate, endDate } = req.query;
      const activity = await analyticsService.getUserActivityMetrics(departmentId, startDate, endDate);
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/dashboard/priority-metrics',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  query('departmentId').optional().isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  validateDateRange,
  filterValidation,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { departmentId, startDate, endDate, status, priority, assignedTo, createdBy } = req.query;
      const metrics = await analyticsService.getPriorityMetrics(departmentId, startDate, endDate, { status, priority, assignedTo, createdBy });
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Anomaly & Trend Detection Endpoints
router.get(
  '/dashboard/department/:departmentId/anomalies',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('departmentId').isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  validateDateRange,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;
      const anomalies = await analyticsService.detectTaskAnomalies(departmentId, startDate, endDate);
      res.json(anomalies);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/dashboard/user/:userId/anomalies',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('userId').isString().withMessage('User ID must be a string').matches(/^USR-[0-9]{8}-[0-9]{5}$/).withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  validateDateRange,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      const anomalies = await analyticsService.detectUserActivityAnomalies(userId, startDate, endDate);
      res.json(anomalies);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/dashboard/department/:departmentId/trends',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('departmentId').isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  validateDateRange,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;
      const trends = await analyticsService.detectDepartmentTrends(departmentId, startDate, endDate);
      res.json(trends);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Predictive Analytics & Forecasting Endpoints
router.get(
  '/dashboard/department/:departmentId/forecast/task-completion',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('departmentId').isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  validateDateRange,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;
      const forecast = await analyticsService.forecastTaskCompletion(departmentId, startDate, endDate);
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/dashboard/user/:userId/forecast/productivity',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('userId').isString().withMessage('User ID must be a string').matches(/^USR-[0-9]{8}-[0-9]{5}$/).withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  validateDateRange,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      const forecast = await analyticsService.forecastUserProductivity(userId, startDate, endDate);
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get(
  '/dashboard/department/:departmentId/forecast/workload',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  param('departmentId').isString().withMessage('Department ID must be a string').matches(/^DEP-[0-9]{8}-[0-9]{5}$/).withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  validateDateRange,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  async (req, res) => {
    try {
      const { departmentId } = req.params;
      const { startDate, endDate } = req.query;
      const forecast = await analyticsService.forecastDepartmentWorkload(departmentId, startDate, endDate);
      res.json(forecast);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Real-time Analytics Endpoints
router.get('/dashboard/live/task-status', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: {
        status: ['in_progress', 'pending']
      },
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: Department,
          attributes: ['id', 'name']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching live task status:', error);
    res.status(500).json({ message: 'Error fetching live task status' });
  }
});

router.get('/dashboard/live/user-activity', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const activities = await Task.findAll({
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['updatedAt', 'DESC']],
      limit: 50
    });

    res.json(activities);
  } catch (error) {
    console.error('Error fetching live user activity:', error);
    res.status(500).json({ message: 'Error fetching live user activity' });
  }
});

router.get('/dashboard/live/department-metrics', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [
        {
          model: Task,
          attributes: ['id', 'status', 'priority']
        }
      ]
    });

    const metrics = departments.map(dept => ({
      departmentId: dept.id,
      departmentName: dept.name,
      totalTasks: dept.Tasks.length,
      completedTasks: dept.Tasks.filter(task => task.status === 'completed').length,
      inProgressTasks: dept.Tasks.filter(task => task.status === 'in_progress').length,
      pendingTasks: dept.Tasks.filter(task => task.status === 'pending').length
    }));

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching live department metrics:', error);
    res.status(500).json({ message: 'Error fetching live department metrics' });
  }
});

module.exports = router; 