const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { AuthService }                  = require('../services/auth.service');
const { UserService }                  = require('../services/user.service');
const { RecordService, DashboardService } = require('../services/record.service');
const { authenticate }                 = require('../middleware/auth.middleware');
const { authorize, atLeast }           = require('../middleware/rbac.middleware');
const {
  validate,
  registerRules, loginRules, updateUserRules,
  createRecordRules, updateRecordRules, recordQueryRules,
  dashboardQueryRules,
} = require('../validators');

// ── Helpers ──────────────────────────────────────────────────────────────────
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/auth/register', registerRules, validate, wrap(async (req, res) => {
  const user = await AuthService.register(req.body);
  res.status(201).json({ success: true, message: 'Registered successfully.', data: user });
}));

router.post('/auth/login', loginRules, validate, wrap(async (req, res) => {
  const data = await AuthService.login(req.body);
  res.json({ success: true, data });
}));

router.get('/auth/me', authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users', authenticate, authorize('admin'), wrap(async (req, res) => {
  const users = await UserService.getAll({ status: req.query.status });
  res.json({ success: true, data: users, total: users.length });
}));

router.get('/users/:id', authenticate, wrap(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.id !== req.params.id)
    return res.status(403).json({ success: false, message: 'Access denied.' });
  const user = await UserService.getById(req.params.id);
  res.json({ success: true, data: user });
}));

router.patch('/users/:id', authenticate, authorize('admin'), updateUserRules, validate, wrap(async (req, res) => {
  const user = await UserService.update(req.params.id, req.body, req.user);
  res.json({ success: true, message: 'User updated.', data: user });
}));

// ── Financial Records ─────────────────────────────────────────────────────────
router.get('/records', authenticate, atLeast('analyst'), recordQueryRules, validate, wrap(async (req, res) => {
  const result = await RecordService.getAll(req.query);
  res.json({ success: true, ...result });
}));

router.get('/records/:id', authenticate, atLeast('analyst'), wrap(async (req, res) => {
  const record = await RecordService.getById(req.params.id);
  res.json({ success: true, data: record });
}));

router.post('/records', authenticate, authorize('admin'), createRecordRules, validate, wrap(async (req, res) => {
  const record = await RecordService.create(req.body, req.user.id);
  res.status(201).json({ success: true, message: 'Record created.', data: record });
}));

router.patch('/records/:id', authenticate, authorize('admin'), updateRecordRules, validate, wrap(async (req, res) => {
  const record = await RecordService.update(req.params.id, req.body);
  res.json({ success: true, message: 'Record updated.', data: record });
}));

router.delete('/records/:id', authenticate, authorize('admin'), wrap(async (req, res) => {
  const result = await RecordService.delete(req.params.id);
  res.json({ success: true, ...result });
}));

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard/overview',       authenticate, atLeast('viewer'), dashboardQueryRules, validate, wrap(async (req, res) => {
  res.json({ success: true, data: await DashboardService.getOverview(req.query) });
}));
router.get('/dashboard/summary',        authenticate, atLeast('viewer'), dashboardQueryRules, validate, wrap(async (req, res) => {
  res.json({ success: true, data: await DashboardService.getSummary(req.query) });
}));
router.get('/dashboard/categories',     authenticate, atLeast('viewer'), dashboardQueryRules, validate, wrap(async (req, res) => {
  res.json({ success: true, data: await DashboardService.getCategories(req.query) });
}));
router.get('/dashboard/trends/monthly', authenticate, atLeast('viewer'), dashboardQueryRules, validate, wrap(async (req, res) => {
  res.json({ success: true, data: await DashboardService.getMonthly(req.query) });
}));
router.get('/dashboard/trends/weekly',  authenticate, atLeast('viewer'), wrap(async (req, res) => {
  res.json({ success: true, data: await DashboardService.getWeekly() });
}));
router.get('/dashboard/recent',         authenticate, atLeast('viewer'), wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  res.json({ success: true, data: await DashboardService.getRecent(limit) });
}));

module.exports = router;
