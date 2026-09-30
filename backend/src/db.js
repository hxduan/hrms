const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.localhost || "localhost",
  port: Number(process.env.DB_PORT) || 1433,
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "12345",
  database: process.env.DB_NAME || "master",
  options: {
    trustServerCertificate: true,
  },
};

let pool;
async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

module.exports = { sql, getPool };
