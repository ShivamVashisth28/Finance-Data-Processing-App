const { body, query, param } = require('express-validator');
const { validationResult } = require('express-validator');

const ROLES    = ['admin', 'analyst', 'viewer'];
const TYPES    = ['income', 'expense'];
const STATUSES = ['active', 'inactive'];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 100 }),
  body('email').trim().isEmail().withMessage('Valid email required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 characters.'),
  body('role').optional().isIn(ROLES).withMessage(`Role must be: ${ROLES.join(', ')}.`),
];

const loginRules = [
  body('email').trim().isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password required.'),
];

const updateUserRules = [
  param('id').isUUID().withMessage('Invalid user ID.'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('email').optional().trim().isEmail().normalizeEmail(),
  body('role').optional().isIn(ROLES),
  body('status').optional().isIn(STATUSES),
];

const createRecordRules = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be > 0.'),
  body('type').isIn(TYPES).withMessage(`Type must be: ${TYPES.join(', ')}.`),
  body('category').trim().notEmpty().isLength({ max: 100 }),
  body('date').isISO8601().withMessage('Date must be YYYY-MM-DD.'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 500 }),
];

const updateRecordRules = [
  param('id').isUUID(),
  body('amount').optional().isFloat({ gt: 0 }),
  body('type').optional().isIn(TYPES),
  body('category').optional().trim().notEmpty().isLength({ max: 100 }),
  body('date').optional().isISO8601(),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 500 }),
];

const recordQueryRules = [
  query('type').optional().isIn(TYPES),
  query('category').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const dashboardQueryRules = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('year').optional().isInt({ min: 2000, max: 2100 }).toInt(),
];

module.exports = {
  validate,
  registerRules, loginRules, updateUserRules,
  createRecordRules, updateRecordRules, recordQueryRules,
  dashboardQueryRules,
};
