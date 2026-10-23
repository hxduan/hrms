require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const app = require('./src/app');
const { getPool } = require('./src/db');
const logger = require('./src/services/logger');
const { damBaoTaiKhoanAdmin } = require('./src/services/adminSeed');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    const pool = await getPool();
    if (process.env.NODE_ENV !== 'production') {
      const daTao = await damBaoTaiKhoanAdmin(pool);
      if (daTao) {
        logger.warn('Đã khởi tạo tài khoản kiểm thử admin/admin; không dùng cấu hình này trong production.');
      }
    }
    app.listen(port, () => {
      logger.info(`Server đang chạy tại http://localhost:${port}`);
    });
  } catch (error) {
    logger.error('Không kết nối được SQL Server — kiểm tra lại .env', error);
    process.exit(1);
  }
}

startServer();
