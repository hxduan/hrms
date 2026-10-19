require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const app = require('./src/app');
const { getPool } = require('./src/db');
const logger = require('./src/services/logger');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    await getPool();
    app.listen(port, () => {
      logger.info(`Server đang chạy tại http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Không kết nối được SQL Server — kiểm tra lại .env', error);
    process.exitCode = 1;
  }
}

startServer();
