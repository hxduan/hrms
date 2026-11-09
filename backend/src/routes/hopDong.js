const express = require('express');
const { getPool, sql } = require('../db');
const { xacThuc, requireRole } = require('../middleware/auth');

const router = express.Router();

// Hợp đồng sắp hết hạn mà chưa được gia hạn: GET /hop-dong/sap-het-han?soNgay=30
router.get('/sap-het-han', xacThuc, requireRole('admin', 'hr'), async (req, res) => {
  const n = Number(req.query.soNgay);
  const soNgay = Number.isInteger(n) && n >= 1 && n <= 365 ? n : 30;
  const pool = await getPool();
  const r = await pool.request().input('SoNgay', sql.Int, soNgay).execute('sp_HopDongSapHetHan');
  res.json(r.recordset);
});

module.exports = router;
