const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');

// Validation middleware
const validateComment = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  body('taskId')
    .isString()
    .withMessage('Task ID must be a valid string')
    .matches(/^TSK-[0-9]{8}-[0-9]{5}$/)
    .withMessage('Task ID must be in the format TSK-YYYYMMDD-XXXXX'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateComment
}; 