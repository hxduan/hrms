const app = require('./app');
const { getPool } = require('./db');
const logger = require('./services/logger');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await getPool(); // kiểm tra kết nối DB ngay khi khởi động, fail sớm nếu sai .env
    app.listen(PORT, () => {
      logger.info(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('Không kết nối được SQL Server — kiểm tra lại .env', err);
    process.exit(1);
  }
}

start();
