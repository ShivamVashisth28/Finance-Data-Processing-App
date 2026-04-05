const { query } = require('../config/db');

const RecordModel = {
  async create({ amount, type, category, date, notes, created_by }) {
    const { rows } = await query(
      `INSERT INTO financial_records (amount, type, category, date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [amount, type, category, date, notes || null, created_by]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await query(
      `SELECT r.*, u.name AS created_by_name
       FROM financial_records r
       JOIN users u ON r.created_by = u.id
       WHERE r.id = $1 AND r.deleted_at IS NULL`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll({ type, category, startDate, endDate, page = 1, limit = 20 } = {}) {
    const conditions = ['r.deleted_at IS NULL'];
    const params = [];

    if (type)      { params.push(type);      conditions.push(`r.type = $${params.length}`); }
    if (category)  { params.push(category);  conditions.push(`r.category ILIKE $${params.length}`); }
    if (startDate) { params.push(startDate); conditions.push(`r.date >= $${params.length}`); }
    if (endDate)   { params.push(endDate);   conditions.push(`r.date <= $${params.length}`); }

    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;

    params.push(limit);  const limitIdx  = params.length;
    params.push(offset); const offsetIdx = params.length;

    const [{ rows: records }, { rows: countRows }] = await Promise.all([
      query(
        `SELECT r.*, u.name AS created_by_name
         FROM financial_records r
         JOIN users u ON r.created_by = u.id
         WHERE ${where}
         ORDER BY r.date DESC, r.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      ),
      query(
        `SELECT COUNT(*)::int AS total FROM financial_records r WHERE ${where}`,
        params.slice(0, params.length - 2)
      ),
    ]);

    const total = countRows[0].total;
    return { records, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  },

  async update(id, fields) {
    const allowed = ['amount', 'type', 'category', 'date', 'notes'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        params.push(fields[key]);
        updates.push(`${key} = $${params.length}`);
      }
    }
    if (updates.length === 0) return this.findById(id);

    params.push(id);
    const { rows } = await query(
      `UPDATE financial_records SET ${updates.join(', ')}
       WHERE id = $${params.length} AND deleted_at IS NULL
       RETURNING *`,
      params
    );
    return rows[0] || null;
  },

  async softDelete(id) {
    await query(
      `UPDATE financial_records SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
  },

  // ── Aggregations ────────────────────────────────────────────────────────────

  async getSummary({ startDate, endDate } = {}) {
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    if (startDate) { params.push(startDate); conditions.push(`date >= $${params.length}`); }
    if (endDate)   { params.push(endDate);   conditions.push(`date <= $${params.length}`); }
    const where = conditions.join(' AND ');

    const { rows } = await query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE type = 'income'),  0)::float AS total_income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::float AS total_expense,
         COUNT(*) FILTER (WHERE type = 'income')::int  AS income_count,
         COUNT(*) FILTER (WHERE type = 'expense')::int AS expense_count
       FROM financial_records WHERE ${where}`,
      params
    );
    const { total_income, total_expense, income_count, expense_count } = rows[0];
    return {
      total_income,
      total_expense,
      net_balance: total_income - total_expense,
      income_count,
      expense_count,
      total_transactions: income_count + expense_count,
    };
  },

  async getCategoryTotals({ startDate, endDate } = {}) {
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    if (startDate) { params.push(startDate); conditions.push(`date >= $${params.length}`); }
    if (endDate)   { params.push(endDate);   conditions.push(`date <= $${params.length}`); }
    const where = conditions.join(' AND ');

    const { rows } = await query(
      `SELECT category, type,
              SUM(amount)::float AS total,
              COUNT(*)::int      AS count
       FROM financial_records WHERE ${where}
       GROUP BY category, type
       ORDER BY total DESC`,
      params
    );
    return rows;
  },

  async getMonthlyTrends({ year } = {}) {
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    if (year) { params.push(year); conditions.push(`EXTRACT(YEAR FROM date) = $${params.length}`); }
    const where = conditions.join(' AND ');

    const { rows } = await query(
      `SELECT
         TO_CHAR(date, 'YYYY-MM') AS month,
         SUM(amount) FILTER (WHERE type = 'income')::float  AS income,
         SUM(amount) FILTER (WHERE type = 'expense')::float AS expense,
         COUNT(*) FILTER (WHERE type = 'income')::int       AS income_count,
         COUNT(*) FILTER (WHERE type = 'expense')::int      AS expense_count
       FROM financial_records WHERE ${where}
       GROUP BY month ORDER BY month ASC`,
      params
    );
    return rows.map(r => ({
      ...r,
      income:  r.income  || 0,
      expense: r.expense || 0,
      net:     (r.income || 0) - (r.expense || 0),
    }));
  },

  async getWeeklyTrends() {
    const { rows } = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('week', date), 'IYYY-"W"IW') AS week,
        SUM(amount) FILTER (WHERE type = 'income')::float  AS income,
        SUM(amount) FILTER (WHERE type = 'expense')::float AS expense
      FROM financial_records
      WHERE deleted_at IS NULL
        AND date >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', date)
      ORDER BY DATE_TRUNC('week', date) ASC
    `);
    return rows.map(r => ({
      ...r,
      income:  r.income  || 0,
      expense: r.expense || 0,
      net:     (r.income || 0) - (r.expense || 0),
    }));
  },

  async getRecentActivity(limit = 10) {
    const { rows } = await query(
      `SELECT r.*, u.name AS created_by_name
       FROM financial_records r
       JOIN users u ON r.created_by = u.id
       WHERE r.deleted_at IS NULL
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [Math.min(limit, 50)]
    );
    return rows;
  },
};

module.exports = RecordModel;
