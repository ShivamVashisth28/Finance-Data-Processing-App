const RecordModel = require('../models/record.model');

const RecordService = {
  async create(data, userId) { return RecordModel.create({ ...data, created_by: userId }); },
  async getAll(filters)      { return RecordModel.findAll(filters); },
  async getById(id) {
    const r = await RecordModel.findById(id);
    if (!r) { const e = new Error('Record not found.'); e.statusCode = 404; throw e; }
    return r;
  },
  async update(id, fields) {
    const r = await RecordModel.findById(id);
    if (!r) { const e = new Error('Record not found.'); e.statusCode = 404; throw e; }
    return RecordModel.update(id, fields);
  },
  async delete(id) {
    const r = await RecordModel.findById(id);
    if (!r) { const e = new Error('Record not found.'); e.statusCode = 404; throw e; }
    await RecordModel.softDelete(id);
    return { message: 'Record deleted.' };
  },
};

const DashboardService = {
  async getSummary(q)      { return RecordModel.getSummary(q); },
  async getCategories(q)   {
    const rows = await RecordModel.getCategoryTotals(q);
    return {
      income:  rows.filter(r => r.type === 'income'),
      expense: rows.filter(r => r.type === 'expense'),
    };
  },
  async getMonthly(q)      { return RecordModel.getMonthlyTrends(q); },
  async getWeekly()        { return RecordModel.getWeeklyTrends(); },
  async getRecent(limit)   { return RecordModel.getRecentActivity(limit); },
  async getOverview(q) {
    const [summary, categories, monthly, weekly, recent] = await Promise.all([
      this.getSummary(q),
      this.getCategories(q),
      this.getMonthly(q),
      this.getWeekly(),
      this.getRecent(10),
    ]);
    return { summary, categories, monthly_trends: monthly, weekly_trends: weekly, recent_activity: recent };
  },
};

module.exports = { RecordService, DashboardService };
