require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const app = require('./src/app');
const { getPool } = require('./src/db');
const logger = require('./src/services/logger');
const { damBaoTaiKhoanAdmin } = require('./src/services/adminSeed');
const { kiemTraServerHRMS } = require('./src/services/serverRunning');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
  if (await kiemTraServerHRMS(port)) {
    logger.info(
      `HRMS đã chạy tại http://localhost:${port}; tiến trình hiện tại không được nạp lại code. ` +
        'Hãy dừng backend cũ rồi chạy pnpm start.',
    );
    return;
  }

  let pool;
  try {
    pool = await getPool();
    if (process.env.NODE_ENV !== 'production') {
      const daTao = await damBaoTaiKhoanAdmin(pool);
      if (daTao) {
        logger.warn('Đã khởi tạo tài khoản kiểm thử admin/admin; không dùng cấu hình này trong production.');
      }
    }
  } catch (error) {
    logger.error('Không kết nối được SQL Server — kiểm tra lại .env', error);
    process.exit(1);
  }

  try {
    await new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        logger.info(`Server đang chạy tại http://localhost:${port}`);
        resolve();
      });
      server.once('error', reject);
    });
  } catch (error) {
    try {
      await pool.close();
    } catch (closeError) {
      logger.error('Không thể đóng kết nối SQL Server sau khi server khởi động thất bại.', closeError);
    }

    if (error.code === 'EADDRINUSE' && await kiemTraServerHRMS(port)) {
      logger.info(
        `HRMS đã chạy tại http://localhost:${port}; tiến trình hiện tại không được nạp lại code. ` +
          'Hãy dừng backend cũ rồi chạy pnpm start.',
      );
      return;
    }

    if (error.code === 'EADDRINUSE') {
      logger.error(`Không thể khởi động server: cổng ${port} đang được ứng dụng khác sử dụng. Hãy dừng ứng dụng đó hoặc đặt PORT khác.`, error);
    } else {
      logger.error('Không thể khởi động server.', error);
    }
    process.exitCode = 1;
  }
}

startServer();
