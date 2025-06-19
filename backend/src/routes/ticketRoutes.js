const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  getTicketStats
} = require('../controllers/ticketController');

// Validation middleware
const validateTicketCreation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  
  body('departmentId')
    .isString()
    .withMessage('Department ID must be a valid string')
    .matches(/^DEP-[0-9]{8}-[0-9]{5}$/)
    .withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  
  body('assignedTo')
    .optional()
    .isString()
    .withMessage('Assigned user ID must be a valid string')
    .matches(/^USR-[0-9]{8}-[0-9]{5}$/)
    .withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const validateTicketUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('status')
    .optional()
    .isIn(['open', 'in_progress', 'resolved', 'closed'])
    .withMessage('Invalid status'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('assignedTo')
    .optional()
    .isString()
    .withMessage('Assigned user ID must be a valid string')
    .matches(/^USR-[0-9]{8}-[0-9]{5}$/)
    .withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
];

const validateTicketQuery = [
  query('status')
    .optional()
    .isIn(['open', 'in_progress', 'resolved', 'closed'])
    .withMessage('Invalid status'),
  
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  query('departmentId')
    .optional()
    .isString()
    .withMessage('Department ID must be a valid string')
    .matches(/^DEP-[0-9]{8}-[0-9]{5}$/)
    .withMessage('Department ID must be in the format DEP-YYYYMMDD-XXXXX'),
  
  query('assignedTo')
    .optional()
    .isString()
    .withMessage('Assigned user ID must be a valid string')
    .matches(/^USR-[0-9]{8}-[0-9]{5}$/)
    .withMessage('User ID must be in the format USR-YYYYMMDD-XXXXX'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes
router.post('/',
  authenticateToken,
  authorizeRole(['admin', 'department_head', 'employee']),
  validateTicketCreation,
  createTicket
);

router.get('/',
  authenticateToken,
  validateTicketQuery,
  getAllTickets
);

router.get('/stats',
  authenticateToken,
  authorizeRole(['admin', 'department_head']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  getTicketStats
);

router.get('/:id',
  authenticateToken,
  param('id')
    .isString()
    .withMessage('Ticket ID must be a valid string')
    .matches(/^TKT-[0-9]{8}-[0-9]{5}$/)
    .withMessage('Ticket ID must be in the format TKT-YYYYMMDD-XXXXX'),
  getTicketById
);

router.put('/:id',
  authenticateToken,
  param('id')
    .isString()
    .withMessage('Ticket ID must be a valid string')
    .matches(/^TKT-[0-9]{8}-[0-9]{5}$/)
    .withMessage('Ticket ID must be in the format TKT-YYYYMMDD-XXXXX'),
  validateTicketUpdate,
  updateTicket
);

router.delete('/:id',
  authenticateToken,
  authorizeRole(['admin']),
  param('id')
    .isString()
    .withMessage('Ticket ID must be a valid string')
    .matches(/^TKT-[0-9]{8}-[0-9]{5}$/)
    .withMessage('Ticket ID must be in the format TKT-YYYYMMDD-XXXXX'),
  deleteTicket
);

module.exports = router; 